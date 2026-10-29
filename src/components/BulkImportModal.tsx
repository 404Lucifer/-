import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  FileCheck2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Product, UserProfile } from '../types';
import { parseProductImportFile, downloadBulkImportTemplate, ParseResult } from '../services/excelService';
import { createProduct } from '../services/inventoryService';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  userProfile: UserProfile;
  onImportComplete: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  products,
  userProfile,
  onImportComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingSkus = new Set(products.map(p => p.sku.toUpperCase()));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setGeneralError(null);
    setParseResult(null);

    try {
      const result = await parseProductImportFile(file, existingSkus);
      setParseResult(result);
    } catch (err: any) {
      console.error('Failed to parse file:', err);
      setGeneralError(err.message || 'Failed to parse spreadsheet file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartImport = async () => {
    if (!parseResult || parseResult.validProducts.length === 0) return;

    setIsImporting(true);
    setGeneralError(null);
    const total = parseResult.validProducts.length;
    let imported = 0;

    try {
      for (const prodInput of parseResult.validProducts) {
        await createProduct(prodInput, userProfile);
        imported++;
        setImportProgress({ current: imported, total });
      }

      onImportComplete();
      onClose();
    } catch (err: any) {
      console.error('Bulk import interrupted:', err);
      setGeneralError(`Import interrupted at item ${imported + 1}: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600/20 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bulk Product Import</h2>
              <p className="text-xs text-slate-400">Upload Excel (.xlsx/.csv) with strict schema validation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Download Template or Upload */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Need the standardized template?</h4>
            <p className="text-[11px] text-slate-400">Download pre-configured columns with example entries.</p>
          </div>
          <button
            onClick={downloadBulkImportTemplate}
            className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download Excel Template</span>
          </button>
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 sm:p-8 text-center bg-slate-950/40 hover:bg-slate-800/40 transition cursor-pointer space-y-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto opacity-80" />
          <div className="text-xs sm:text-sm font-semibold text-slate-200">
            {selectedFile ? selectedFile.name : 'Click to select or drag and drop Excel / CSV file'}
          </div>
          <p className="text-[11px] text-slate-500">
            Supports .xlsx, .xls, and .csv files. Validates unique SKUs, formats, and initial stock workflows.
          </p>
        </div>

        {/* Parsing Indicator */}
        {isParsing && (
          <div className="py-4 text-center text-xs text-indigo-400 font-medium">
            Analyzing and validating spreadsheet rows...
          </div>
        )}

        {/* Parse Summary and Validation Feedback */}
        {parseResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Rows Scanned</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {parseResult.totalRows}
                </span>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-3 text-center">
                <span className="text-[10px] uppercase text-emerald-400 font-bold block">Valid Products</span>
                <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
                  {parseResult.validProducts.length}
                </span>
              </div>
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 text-center">
                <span className="text-[10px] uppercase text-rose-400 font-bold block">Validation Errors</span>
                <span className="text-xl font-bold font-mono text-rose-300 mt-1 block">
                  {parseResult.errors.length}
                </span>
              </div>
            </div>

            {/* Error List if any */}
            {parseResult.errors.length > 0 && (
              <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 space-y-1.5 max-h-40 overflow-y-auto">
                <div className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>The following rows were rejected by integrity checks:</span>
                </div>
                {parseResult.errors.map((err, i) => (
                  <div key={i} className="text-[11px] text-rose-300/90 font-mono">
                    • Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            )}

            {/* Preview of Valid Items */}
            {parseResult.validProducts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ready to Import ({parseResult.validProducts.length} Products):</span>
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 uppercase text-[10px] text-slate-400 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Price</th>
                        <th className="py-2 px-3 text-right">Threshold</th>
                        <th className="py-2 px-3 text-right">Opening Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {parseResult.validProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-mono font-bold text-indigo-300">{p.sku}</td>
                          <td className="py-1.5 px-3">{p.name}</td>
                          <td className="py-1.5 px-3 text-slate-400">{p.category}</td>
                          <td className="py-1.5 px-3 text-right font-mono">${p.unitPrice.toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{p.minStockThreshold}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-emerald-400 font-bold">
                            {p.initialStock || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar during Import */}
        {isImporting && importProgress && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Executing transactional creation...</span>
              <span className="font-mono">{importProgress.current} / {importProgress.total}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-200"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* General Error */}
        {generalError && (
          <div className="bg-rose-950 border border-rose-800 text-rose-200 text-xs rounded-xl p-3 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartImport}
            disabled={!parseResult || parseResult.validProducts.length === 0 || isImporting}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer disabled:opacity-50 flex items-center space-x-2"
          >
            <span>{isImporting ? 'Importing Products...' : `Import ${parseResult?.validProducts.length || 0} Valid Items`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
