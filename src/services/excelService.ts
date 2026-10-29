import * as XLSX from 'xlsx';
import { Product, Invoice, AuditLog } from '../types';
import { CreateProductInput } from './inventoryService';

export interface ParseResult {
  validProducts: (CreateProductInput & { initialStock?: number })[];
  errors: { row: number; sku?: string; error: string }[];
  totalRows: number;
}

/**
 * Downloads a multi-sheet Excel file (.xlsx) with current stock, alerts, and invoices
 */
export function exportInventoryToExcel(
  products: Product[],
  invoices: Invoice[],
  auditLogs: AuditLog[]
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Inventory
  const inventoryData = products.map((p) => ({
    'SKU': p.sku,
    'Product Name': p.name,
    'Category': p.category,
    'Current Stock': p.currentStock,
    'Min Threshold': p.minStockThreshold,
    'Unit': p.unit,
    'Unit Cost ($)': p.unitPrice,
    'Total Valuation ($)': Number((p.currentStock * p.unitPrice).toFixed(2)),
    'Location': p.location,
    'Stock Status': p.currentStock === 0 ? 'OUT OF STOCK' : (p.currentStock <= p.minStockThreshold ? 'LOW STOCK' : 'OPTIMAL'),
    'Last Updated': p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ''
  }));
  const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(wb, wsInventory, 'Current Inventory');

  // Sheet 2: Low Stock Alerts
  const lowStock = products.filter(p => p.currentStock <= p.minStockThreshold);
  const lowStockData = lowStock.map((p) => ({
    'SKU': p.sku,
    'Product Name': p.name,
    'Current Stock': p.currentStock,
    'Min Threshold': p.minStockThreshold,
    'Deficit': Math.max(0, p.minStockThreshold - p.currentStock),
    'Recommended Reorder': Math.max(p.minStockThreshold * 2 - p.currentStock, 10),
    'Unit': p.unit,
    'Location': p.location
  }));
  const wsLowStock = XLSX.utils.json_to_sheet(lowStockData);
  XLSX.utils.book_append_sheet(wb, wsLowStock, 'Low Stock Alerts');

  // Sheet 3: Invoices
  const invoicesData = invoices.map((inv) => ({
    'Invoice Number': inv.invoiceNumber,
    'Type': inv.type.toUpperCase(),
    'Reference': inv.referenceNumber,
    'Status': inv.status,
    'Processed By': inv.createdByEmail,
    'Date': new Date(inv.createdAt).toLocaleString(),
    'Item Count': inv.totalItems,
    'Total Units': inv.totalQuantity,
    'Total Amount ($)': inv.totalAmount,
    'Notes': inv.notes
  }));
  const wsInvoices = XLSX.utils.json_to_sheet(invoicesData);
  XLSX.utils.book_append_sheet(wb, wsInvoices, 'Invoices & Movements');

  // Sheet 4: Audit Trail
  const auditData = auditLogs.map((log) => ({
    'Timestamp': new Date(log.timestamp).toLocaleString(),
    'User': log.userEmail,
    'Action': log.action,
    'Entity Type': log.entityType,
    'Entity ID': log.entityId,
    'Details': log.details
  }));
  const wsAudit = XLSX.utils.json_to_sheet(auditData);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit Trail');

  // Trigger browser download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `StockVault_Inventory_Report_${dateStr}.xlsx`);
}

/**
 * Parses and validates an uploaded Excel (.xlsx) or CSV file for bulk product imports
 */
export async function parseProductImportFile(
  file: File,
  existingSkus: Set<string>
): Promise<ParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to array of objects with raw headers
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const validProducts: (CreateProductInput & { initialStock?: number })[] = [];
  const errors: { row: number; sku?: string; error: string }[] = [];
  const seenSkusInFile = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Accounting for 1-based index and header row

    // Normalize keys (case-insensitive and trimmed)
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      normalizedRow[k.trim().toLowerCase()] = row[k];
    });

    const sku = (normalizedRow['sku'] || normalizedRow['sku code'] || normalizedRow['item code'] || '').toString().trim().toUpperCase();
    const name = (normalizedRow['product name'] || normalizedRow['name'] || normalizedRow['title'] || '').toString().trim();
    const category = (normalizedRow['category'] || normalizedRow['group'] || 'General').toString().trim();
    const unit = (normalizedRow['unit'] || normalizedRow['uom'] || 'Units').toString().trim();
    const location = (normalizedRow['location'] || normalizedRow['bin'] || 'Warehouse A').toString().trim();
    const description = (normalizedRow['description'] || normalizedRow['notes'] || '').toString().trim();

    const unitPriceRaw = normalizedRow['unit price'] || normalizedRow['price'] || normalizedRow['unit cost'] || 0;
    const minThresholdRaw = normalizedRow['minimum stock threshold'] || normalizedRow['min stock'] || normalizedRow['threshold'] || 0;
    const initialStockRaw = normalizedRow['initial stock'] || normalizedRow['opening stock'] || normalizedRow['quantity'] || 0;

    const unitPrice = parseFloat(unitPriceRaw);
    const minStockThreshold = parseInt(minThresholdRaw, 10);
    const initialStock = parseInt(initialStockRaw, 10);

    // Validation checks
    if (!sku) {
      errors.push({ row: rowNumber, error: 'SKU is missing or blank.' });
      return;
    }

    if (seenSkusInFile.has(sku)) {
      errors.push({ row: rowNumber, sku, error: `Duplicate SKU "${sku}" found within the uploaded file.` });
      return;
    }
    seenSkusInFile.add(sku);

    if (existingSkus.has(sku)) {
      errors.push({ row: rowNumber, sku, error: `SKU "${sku}" already exists in the catalog database.` });
      return;
    }

    if (!name) {
      errors.push({ row: rowNumber, sku, error: 'Product name is required.' });
      return;
    }

    if (isNaN(unitPrice) || unitPrice < 0) {
      errors.push({ row: rowNumber, sku, error: 'Unit price must be a valid non-negative number.' });
      return;
    }

    if (isNaN(minStockThreshold) || minStockThreshold < 0) {
      errors.push({ row: rowNumber, sku, error: 'Minimum stock threshold must be a non-negative integer.' });
      return;
    }

    if (isNaN(initialStock) || initialStock < 0) {
      errors.push({ row: rowNumber, sku, error: 'Initial stock must be a non-negative integer.' });
      return;
    }

    validProducts.push({
      sku,
      name,
      category,
      unit,
      unitPrice,
      minStockThreshold,
      location,
      description,
      initialStock
    });
  });

  return {
    validProducts,
    errors,
    totalRows: rawRows.length
  };
}

/**
 * Generates and downloads a pre-formatted Excel template for bulk product import
 */
export function downloadBulkImportTemplate(): void {
  const templateRows = [
    {
      'SKU': 'ELEC-RES-10K',
      'Product Name': '10k Ohm Metal Film Resistor',
      'Category': 'Electronics',
      'Unit': 'Packs',
      'Unit Price': 3.50,
      'Min Stock Threshold': 40,
      'Location': 'Section B - Bin 04',
      'Description': '1/4W 1% precision resistors (100 pcs/pack)',
      'Initial Stock': 150
    },
    {
      'SKU': 'HDW-WASHER-M8',
      'Product Name': 'M8 Flat Washer Stainless Steel',
      'Category': 'Hardware',
      'Unit': 'Boxes',
      'Unit Price': 4.20,
      'Min Stock Threshold': 50,
      'Location': 'Fastener Bin B-18',
      'Description': 'A2 stainless plain washers DIN 125',
      'Initial Stock': 80
    },
    {
      'SKU': 'RAW-COPPER-PIPE',
      'Product Name': 'Type L Copper Pipe 15mm (3m)',
      'Category': 'Raw Materials',
      'Unit': 'Pipes',
      'Unit Price': 18.00,
      'Min Stock Threshold': 20,
      'Location': 'Pipe Rack C-02',
      'Description': 'Hard-drawn copper water tube',
      'Initial Stock': 5
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Product Import Template');

  XLSX.writeFile(wb, 'StockVault_Product_Import_Template.xlsx');
}
