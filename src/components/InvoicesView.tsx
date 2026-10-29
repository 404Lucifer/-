import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  Printer,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  User,
  Hash,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Invoice, InvoiceItem, UserProfile } from '../types';
import { getInvoiceItems, updateInvoiceMetadata, deleteInvoice } from '../services/inventoryService';

interface InvoicesViewProps {
  invoices: Invoice[];
  userProfile?: UserProfile | null;
  onOpenCreateInvoice: (defaultType?: 'import' | 'export') => void;
  isAdmin: boolean;
  onInvoiceUpdated?: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  userProfile,
  onOpenCreateInvoice,
  isAdmin,
  onInvoiceUpdated
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'import' | 'export'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Administrative Edit State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editReference, setEditReference] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'completed' | 'cancelled'>('completed');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Administrative Delete State
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [revertStock, setRevertStock] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.createdByEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.notes && inv.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || inv.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleInspectInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsLoadingItems(true);
    try {
      const items = await getInvoiceItems(invoice.id);
      setInvoiceItems(items);
    } catch (error) {
      console.error('Failed to fetch invoice items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleOpenEdit = (inv: Invoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingInvoice(inv);
    setEditReference(inv.referenceNumber || '');
    setEditNotes(inv.notes || '');
    setEditStatus(inv.status === 'cancelled' ? 'cancelled' : 'completed');
    setActionError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice || !userProfile) return;

    setIsSavingEdit(true);
    setActionError(null);
    try {
      await updateInvoiceMetadata(
        editingInvoice.id,
        {
          referenceNumber: editReference.trim(),
          notes: editNotes.trim(),
          status: editStatus
        },
        userProfile
      );

      // Update local inspect modal if open
      if (selectedInvoice && selectedInvoice.id === editingInvoice.id) {
        setSelectedInvoice({
          ...selectedInvoice,
          referenceNumber: editReference.trim(),
          notes: editNotes.trim(),
          status: editStatus
        });
      }

      setEditingInvoice(null);
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      console.error('Failed to update invoice:', err);
      setActionError(err.message || 'Failed to update invoice.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenDelete = (inv: Invoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingInvoice(inv);
    setRevertStock(true);
    setActionError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingInvoice || !userProfile) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteInvoice(deletingInvoice.id, revertStock, userProfile);
      if (selectedInvoice && selectedInvoice.id === deletingInvoice.id) {
        setSelectedInvoice(null);
      }
      setDeletingInvoice(null);
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      setActionError(err.message || 'Failed to delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Invoices</span>
            <span className="text-2xl font-bold font-mono text-white block mt-0.5">{invoices.length}</span>
          </div>
          <div className="bg-indigo-600/20 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/30">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Import Receipts (Stock In)</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 block mt-0.5">
              {invoices.filter(i => i.type === 'import').length}
            </span>
          </div>
          <div className="bg-emerald-600/20 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/30">
            <ArrowDownToLine className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Export Dispatches (Stock Out)</span>
            <span className="text-2xl font-bold font-mono text-rose-400 block mt-0.5">
              {invoices.filter(i => i.type === 'export').length}
            </span>
          </div>
          <div className="bg-rose-600/20 p-2.5 rounded-xl text-rose-400 border border-rose-500/30">
            <ArrowUpFromLine className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice #, reference PO/DO, or administrator email..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Movements
          </button>
          <button
            onClick={() => setTypeFilter('import')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
              typeFilter === 'import'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-emerald-400 hover:bg-slate-750'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Imports</span>
          </button>
          <button
            onClick={() => setTypeFilter('export')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
              typeFilter === 'export'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-rose-400 hover:bg-slate-750'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Exports</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Movement Type</th>
                <th className="py-3.5 px-4">Reference / PO #</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Processed By</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4 text-right">Total Units</th>
                <th className="py-3.5 px-4 text-right">Total Value</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-medium text-slate-400">No invoice records found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Process an Import or Export invoice to register stock movements.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => handleInspectInvoice(inv)}
                    className="hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100 text-xs">
                      <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                        {inv.invoiceNumber}
                      </span>
                      {inv.status === 'cancelled' && (
                        <span className="ml-1.5 text-[10px] text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.type === 'import' ? (
                        <span className="inline-flex items-center space-x-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          <ArrowDownToLine className="w-3 h-3 text-emerald-400" />
                          <span>IMPORT</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-rose-950/80 text-rose-300 border border-rose-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          <ArrowUpFromLine className="w-3 h-3 text-rose-400" />
                          <span>EXPORT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {inv.referenceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(inv.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 truncate max-w-[160px]">
                      {inv.createdByEmail}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                      {inv.totalItems}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                      {inv.totalQuantity.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-400 font-bold">
                      ${inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleInspectInvoice(inv)}
                          title="Inspect Details"
                          className="p-1 rounded text-indigo-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => handleOpenEdit(inv, e)}
                              title="Edit Invoice Metadata"
                              className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleOpenDelete(inv, e)}
                              title="Delete Invoice"
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal with Audit Delta */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 print:p-0 print:bg-white">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4 print:border-gray-300">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    selectedInvoice.type === 'import'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 print:bg-green-100 print:text-green-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800 print:bg-red-100 print:text-red-800'
                  }`}>
                    {selectedInvoice.type.toUpperCase()} INVOICE
                  </span>
                  <span className="font-mono text-xs text-slate-400 print:text-gray-600">
                    Ref: {selectedInvoice.referenceNumber}
                  </span>
                  {selectedInvoice.status === 'cancelled' && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                      CANCELLED
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white print:text-black mt-1 font-mono">
                  {selectedInvoice.invoiceNumber}
                </h2>
                <div className="text-xs text-slate-400 print:text-gray-600 mt-1 flex flex-wrap gap-x-4">
                  <span>Processed: {new Date(selectedInvoice.createdAt).toLocaleString()}</span>
                  <span>Administrator: {selectedInvoice.createdByEmail}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 print:hidden">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleOpenEdit(selectedInvoice)}
                      className="p-2 text-slate-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      title="Edit Invoice"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(selectedInvoice)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={handlePrint}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Print Invoice"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notes if present */}
            {selectedInvoice.notes && (
              <div className="bg-slate-800/60 print:bg-gray-100 border border-slate-700 print:border-gray-200 rounded-xl p-3 text-xs text-slate-300 print:text-gray-700">
                <strong className="text-slate-200 print:text-black">Audit Remarks: </strong>
                {selectedInvoice.notes}
              </div>
            )}

            {/* Line Items with Stock Delta Audit */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-gray-600">
                Itemized Movements & Audit Stock Deltas
              </h3>

              {isLoadingItems ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading itemized audit records...</div>
              ) : (
                <div className="border border-slate-800 print:border-gray-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300 print:text-black">
                    <thead className="bg-slate-950 print:bg-gray-100 uppercase text-[10px] font-semibold text-slate-400 print:text-gray-600 border-b border-slate-800 print:border-gray-300">
                      <tr>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 text-center">Audit Delta (Before → After)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                      {invoiceItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-100 print:text-black">
                            {item.sku}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {item.productName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {item.quantity} {item.unit || 'units'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 print:text-green-700">
                            ${item.subtotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            <span className="text-slate-400 print:text-gray-500">{item.previousStock}</span>
                            <span className="mx-1 text-indigo-400 print:text-blue-600 font-bold">→</span>
                            <span className="font-bold text-white print:text-black">{item.newStock}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total Summary */}
            <div className="flex justify-end pt-2">
              <div className="bg-slate-950 print:bg-gray-100 border border-slate-800 print:border-gray-300 rounded-2xl p-4 w-full sm:w-72 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400 print:text-gray-600">
                  <span>Total Quantity Moved:</span>
                  <span className="font-mono font-bold text-slate-100 print:text-black">
                    {selectedInvoice.totalQuantity.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 print:text-gray-600">
                  <span>Total Line Items:</span>
                  <span className="font-mono text-slate-100 print:text-black">{selectedInvoice.totalItems}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-400 print:text-green-700 border-t border-slate-800 print:border-gray-300 pt-1 mt-1">
                  <span>Total Invoice Valuation:</span>
                  <span className="font-mono">
                    ${selectedInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Certification Signature Block for Print */}
            <div className="hidden print:block pt-12 border-t border-gray-300 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <div className="border-b border-gray-400 pb-8 mb-2"></div>
                  <p className="font-bold">Authorized Warehouse Officer Signature</p>
                  <p className="text-gray-500">Date: ________________________</p>
                </div>
                <div>
                  <div className="border-b border-gray-400 pb-8 mb-2"></div>
                  <p className="font-bold">Inventory Audit Controller Verification</p>
                  <p className="text-gray-500">Status: ACID Verified & Logged</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Administrative Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <span>Edit Invoice {editingInvoice.invoiceNumber}</span>
              </h3>
              <button
                onClick={() => setEditingInvoice(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reference / PO / DO #
                </label>
                <input
                  type="text"
                  required
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="completed">Completed / Active</option>
                  <option value="cancelled">Cancelled (Mark as Inactive)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Audit Notes / Reason
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {actionError && (
                <div className="bg-rose-950 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Administrative Delete Invoice Modal */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="bg-rose-950/60 p-2 rounded-xl border border-rose-800/80">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Invoice Record</h3>
                <p className="text-xs text-slate-400 font-mono">{deletingInvoice.invoiceNumber}</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p>
                Are you sure you want to permanently delete this {deletingInvoice.type.toUpperCase()} invoice
                (Ref: {deletingInvoice.referenceNumber}) containing {deletingInvoice.totalQuantity} total units?
              </p>

              <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revertStock}
                  onChange={(e) => setRevertStock(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-200 block flex items-center space-x-1">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Reverse inventory stock adjustments</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-normal">
                    {deletingInvoice.type === 'import'
                      ? 'Deducts the previously received stock counts from products.'
                      : 'Restores the previously dispatched stock counts back into storage.'}
                  </span>
                </div>
              </label>

              {actionError && (
                <div className="bg-rose-950 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingInvoice(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting & Reconciling...' : 'Confirm Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
