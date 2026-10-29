import { Product, Invoice, AuditLog } from '../types';

export interface GoogleSheetExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

/**
 * Creates and formats a live Google Sheet in the user's Google Drive
 * with full inventory levels, invoice history, and audit log.
 */
export async function exportToGoogleSheets(
  accessToken: string,
  products: Product[],
  invoices: Invoice[],
  auditLogs: AuditLog[]
): Promise<GoogleSheetExportResult> {
  if (!accessToken) {
    throw new Error('Google OAuth access token is required. Please sign in with Google.');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const title = `StockVault Inventory Report - ${todayStr}`;

  // 1. Create a new Spreadsheet with 3 tabs
  const createPayload = {
    properties: {
      title
    },
    sheets: [
      {
        properties: {
          title: 'Current Inventory',
          gridProperties: { rowCount: Math.max(products.length + 10, 50), columnCount: 12, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'Invoice Transactions',
          gridProperties: { rowCount: Math.max(invoices.length + 10, 50), columnCount: 10, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'Audit Trail',
          gridProperties: { rowCount: Math.max(auditLogs.length + 10, 50), columnCount: 8, frozenRowCount: 1 }
        }
      }
    ]
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });

  if (!createRes.ok) {
    const errorBody = await createRes.json().catch(() => ({}));
    throw new Error(
      errorBody.error?.message || `Failed to create Google Sheet: HTTP ${createRes.status}`
    );
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare Tab 1: Current Inventory Data
  const inventoryHeaders = [
    'SKU',
    'Product Name',
    'Category',
    'Current Stock',
    'Min Threshold',
    'Unit',
    'Unit Cost ($)',
    'Total Valuation ($)',
    'Location',
    'Stock Status'
  ];

  const inventoryRows = products.map((p) => {
    const totalVal = Number((p.currentStock * p.unitPrice).toFixed(2));
    let status = 'OPTIMAL';
    if (p.currentStock === 0) status = 'OUT OF STOCK';
    else if (p.currentStock <= p.minStockThreshold) status = 'LOW STOCK ALERT';

    return [
      p.sku,
      p.name,
      p.category,
      p.currentStock,
      p.minStockThreshold,
      p.unit,
      p.unitPrice,
      totalVal,
      p.location,
      status
    ];
  });

  // 3. Prepare Tab 2: Invoice Transactions Data
  const invoiceHeaders = [
    'Invoice Number',
    'Type',
    'Reference / PO #',
    'Date & Time',
    'Status',
    'Processed By',
    'Item Count',
    'Total Units',
    'Total Value ($)',
    'Notes'
  ];

  const invoiceRows = invoices.map((inv) => [
    inv.invoiceNumber,
    inv.type.toUpperCase(),
    inv.referenceNumber || 'N/A',
    new Date(inv.createdAt).toLocaleString(),
    inv.status.toUpperCase(),
    inv.createdByEmail,
    inv.totalItems,
    inv.totalQuantity,
    Number(inv.totalAmount.toFixed(2)),
    inv.notes || ''
  ]);

  // 4. Prepare Tab 3: Audit Trail Data
  const auditHeaders = [
    'Timestamp',
    'User Email',
    'Action Code',
    'Entity Type',
    'Entity ID',
    'Details'
  ];

  const auditRows = auditLogs.map((log) => [
    new Date(log.timestamp).toLocaleString(),
    log.userEmail,
    log.action,
    log.entityType,
    log.entityId,
    log.details
  ]);

  // 5. Batch update spreadsheet values
  const valuePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'Current Inventory'!A1:J" + (inventoryRows.length + 1),
        values: [inventoryHeaders, ...inventoryRows]
      },
      {
        range: "'Invoice Transactions'!A1:J" + (invoiceRows.length + 1),
        values: [invoiceHeaders, ...invoiceRows]
      },
      {
        range: "'Audit Trail'!A1:F" + (auditRows.length + 1),
        values: [auditHeaders, ...auditRows]
      }
    ]
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(valuePayload)
    }
  );

  if (!updateRes.ok) {
    const errorBody = await updateRes.json().catch(() => ({}));
    console.warn('Failed populating Google Sheet values:', errorBody);
  }

  // 6. Style the headers (Navy background, bold white text)
  try {
    const formatRequests: any[] = [];
    const sheetIds = spreadsheet.sheets.map((s: any) => s.properties.sheetId);

    for (const sId of sheetIds) {
      formatRequests.push({
        repeatCell: {
          range: {
            sheetId: sId,
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.08, green: 0.18, blue: 0.36 }, // dark navy
              textFormat: {
                foregroundColor: { red: 1, green: 1, blue: 1 },
                bold: true,
                fontSize: 10
              },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      });
    }

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: formatRequests })
    });
  } catch (e) {
    console.warn('Google Sheet header formatting optional step skipped:', e);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title
  };
}
