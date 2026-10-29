import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  ExternalLink,
  AlertTriangle,
  Boxes,
  DollarSign,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { Product, Invoice, AuditLog, UserProfile } from '../types';
import { exportToGoogleSheets, GoogleSheetExportResult } from '../services/googleSheetsService';
import { exportInventoryToExcel } from '../services/excelService';

interface ReportsViewProps {
  products: Product[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  userProfile: UserProfile | null;
  hasGoogleToken: boolean;
  accessToken: string | null;
  onConnectGoogle: () => void;
  onOpenCreateInvoice: (defaultType?: 'import' | 'export', defaultProductId?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  products,
  invoices,
  auditLogs,
  userProfile,
  hasGoogleToken,
  accessToken,
  onConnectGoogle,
  onOpenCreateInvoice
}) => {
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [sheetsResult, setSheetsResult] = useState<GoogleSheetExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Summary Metrics
  const totalSkus = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (Number(p.currentStock) || 0), 0);
  const totalValuation = products.reduce((acc, p) => acc + (p.currentStock * p.unitPrice), 0);
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStockThreshold);

  const importInvoices = invoices.filter(i => i.type === 'import');
  const exportInvoices = invoices.filter(i => i.type === 'export');

  const totalImportUnits = importInvoices.reduce((acc, i) => acc + i.totalQuantity, 0);
  const totalExportUnits = exportInvoices.reduce((acc, i) => acc + i.totalQuantity, 0);
  const totalImportAmount = importInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalExportAmount = exportInvoices.reduce((acc, i) => acc + i.totalAmount, 0);

  const handleExportGoogleSheets = async () => {
    setExportError(null);
    if (!accessToken) {
      onConnectGoogle();
      return;
    }

    setIsExportingSheets(true);
    try {
      const result = await exportToGoogleSheets(accessToken, products, invoices, auditLogs);
      setSheetsResult(result);
    } catch (err: any) {
      console.error('Google Sheets Export Error:', err);
      setExportError(err.message || 'Failed to export to Google Sheets.');
    } finally {
      setIsExportingSheets(false);
    }
  };

  const handleExportExcel = () => {
    try {
      exportInventoryToExcel(products, invoices, auditLogs);
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      setExportError('Failed to generate Excel file: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Catalog SKUs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Catalog Products (SKUs)</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white block mt-1">
              {totalSkus.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Unique items tracked</span>
          </div>
          <div className="bg-indigo-600/20 p-3 rounded-2xl text-indigo-400 border border-indigo-500/30">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Total Stored Quantity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Stored Units</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 block mt-1">
              {totalUnits.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-400 mt-0.5 block font-medium">Active in storage</span>
          </div>
          <div className="bg-emerald-600/20 p-3 rounded-2xl text-emerald-400 border border-emerald-500/30">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Total Warehouse Valuation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Inventory Asset Value</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 block mt-1">
              ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Estimated holding valuation</span>
          </div>
          <div className="bg-emerald-600/20 p-3 rounded-2xl text-emerald-400 border border-emerald-500/30">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Critical Low Stock Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Low Stock Alerts</span>
            <span className={`text-2xl sm:text-3xl font-bold font-mono block mt-1 ${lowStockProducts.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {lowStockProducts.length}
            </span>
            <span className="text-[11px] text-amber-300/80 mt-0.5 block font-medium">
              {lowStockProducts.length > 0 ? 'Items require replenishment' : 'All items optimal'}
            </span>
          </div>
          <div className="bg-amber-600/20 p-3 rounded-2xl text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Export Hub Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              <span>Multi-Channel Report Export Hub</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Export comprehensive multi-sheet reports covering live inventory, low-stock deficits, invoice histories, and immutable audit logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Google Sheets Export Button */}
            <button
              onClick={handleExportGoogleSheets}
              disabled={isExportingSheets}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingSheets ? 'Generating Google Sheet...' : 'Export to Google Sheets'}</span>
            </button>

            {/* Excel Download Button */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Excel (.xlsx)</span>
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Print / PDF Report</span>
            </button>
          </div>
        </div>

        {/* Google Sheet Success Modal / Alert */}
        {sheetsResult && (
          <div className="bg-emerald-950/80 border border-emerald-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-100 animate-in fade-in duration-300">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-xs sm:text-sm">
                  Google Sheet Generated in Your Google Drive!
                </p>
                <p className="text-[11px] text-emerald-300/80">
                  Spreadsheet: <strong>{sheetsResult.title}</strong> with 3 formatted tabs: Inventory, Invoices, and Audit Trail.
                </p>
              </div>
            </div>
            <a
              href={sheetsResult.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0"
            >
              <span>Open in Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Error Notification if any */}
        {exportError && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}
      </div>

      {/* Historical Stock Movements Summary (Imports vs Exports) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Imports Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-600/20 p-2 rounded-xl text-emerald-400 border border-emerald-500/30">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-100">Historical Import Inflow (Receipts)</h4>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {importInvoices.length} Invoices
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Received Units</span>
              <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
                +{totalImportUnits.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Intake Value</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                ${totalImportAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Exports Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-rose-600/20 p-2 rounded-xl text-rose-400 border border-rose-500/30">
                <ArrowUpFromLine className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-100">Historical Export Outflow (Dispatches)</h4>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400">
              {exportInvoices.length} Invoices
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Dispatched Units</span>
              <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
                -{totalExportUnits.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Dispatch Value</span>
              <span className="text-lg font-bold font-mono text-rose-400 mt-1 block">
                ${totalExportAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Reorder Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Low-Stock Replenishment Center ({lowStockProducts.length} Items)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Automatic threshold trigger</span>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-200">Inventory Levels Optimal</p>
            <p className="text-slate-500 mt-0.5">All catalog items have stock safely above their designated minimum thresholds.</p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 uppercase text-[10px] font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Min Threshold</th>
                  <th className="py-2.5 px-3 text-right">Stock Deficit</th>
                  <th className="py-2.5 px-3">Storage Location</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {lowStockProducts.map((p) => {
                  const deficit = Math.max(0, p.minStockThreshold - p.currentStock);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300">{p.sku}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">{p.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                        {p.currentStock} {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {p.minStockThreshold} {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        -{deficit} {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{p.location}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenCreateInvoice('import', p.id)}
                          className="bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          + Restock Import
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
