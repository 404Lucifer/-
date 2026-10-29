import React, { useState, useEffect } from 'react';
import {
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  X
} from 'lucide-react';
import { Product, UserProfile, InvoiceType } from '../types';
import { processInvoiceTransaction, InvoiceItemInput } from '../services/inventoryService';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  userProfile: UserProfile;
  initialType?: InvoiceType;
  initialProductId?: string;
  onInvoiceCreated: () => void;
}

interface FormLineItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  products,
  userProfile,
  initialType = 'import',
  initialProductId,
  onInvoiceCreated
}) => {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialType);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    {
      id: '1',
      productId: initialProductId || (products[0]?.id || ''),
      quantity: 1,
      unitPrice: products.find(p => p.id === initialProductId)?.unitPrice || products[0]?.unitPrice || 0
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  useEffect(() => {
    if (initialType) setInvoiceType(initialType);
    if (initialProductId && products.some(p => p.id === initialProductId)) {
      const prod = products.find(p => p.id === initialProductId)!;
      setLineItems([{
        id: '1',
        productId: prod.id,
        quantity: 1,
        unitPrice: prod.unitPrice
      }]);
    }
  }, [initialType, initialProductId, products]);

  if (!isOpen) return null;

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find(p => p.id === newProductId);
    const updated = [...lineItems];
    updated[index].productId = newProductId;
    if (prod) {
      updated[index].unitPrice = prod.unitPrice;
    }
    setLineItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...lineItems];
    updated[index].quantity = Math.max(1, qty);
    setLineItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...lineItems];
    updated[index].unitPrice = Math.max(0, price);
    setLineItems(updated);
  };

  const addLineItem = () => {
    const unusedProduct = products.find(p => !lineItems.some(item => item.productId === p.id)) || products[0];
    setLineItems([
      ...lineItems,
      {
        id: Math.random().toString(),
        productId: unusedProduct ? unusedProduct.id : '',
        quantity: 1,
        unitPrice: unusedProduct ? unusedProduct.unitPrice : 0
      }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Calculations
  const totalUnits = lineItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const totalAmount = lineItems.reduce((acc, item) => {
    return acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);

  // Validation
  const validationErrors: string[] = [];
  if (!referenceNumber.trim()) {
    validationErrors.push('Reference Number (PO, DO, or dispatch note) is required for audit verification.');
  }

  // Stock check for Export
  if (invoiceType === 'export') {
    lineItems.forEach((item, idx) => {
      const prod = products.find(p => p.id === item.productId);
      if (prod && item.quantity > prod.currentStock) {
        validationErrors.push(
          `Line ${idx + 1}: Requested export of ${item.quantity} ${prod.unit} exceeds current stock of ${prod.currentStock} ${prod.unit} for ${prod.name} (${prod.sku}).`
        );
      }
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors[0]);
      return;
    }

    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload: InvoiceItemInput[] = lineItems.map(item => {
        const prod = products.find(p => p.id === item.productId)!;
        return {
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: prod.unit
        };
      });

      await processInvoiceTransaction({
        type: invoiceType,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        items: itemsPayload,
        userProfile
      });

      onInvoiceCreated();
      onClose();
    } catch (err: any) {
      console.error('Invoice Processing Error:', err);
      setErrorMessage(err.message || 'Failed to process transactional invoice.');
      setConfirmStep(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${invoiceType === 'import' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'}`}>
              {invoiceType === 'import' ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {invoiceType === 'import' ? 'Generate Import Invoice (Stock In)' : 'Generate Export Invoice (Stock Out)'}
              </h2>
              <p className="text-xs text-slate-400">Formal transactional stock modification workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Invoice Type Selector Buttons */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setInvoiceType('import'); setConfirmStep(false); }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                invoiceType === 'import'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Import Invoice (Stock Receipt)</span>
            </button>
            <button
              type="button"
              onClick={() => { setInvoiceType('export'); setConfirmStep(false); }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                invoiceType === 'export'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              <span>Export Invoice (Stock Dispatch)</span>
            </button>
          </div>

          {/* Reference & Notes Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reference / PO / DO Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. PO-2026-8819 or DISP-4401"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Audit Notes / Dispatch Reason
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Scheduled supplier shipment, client order, maintenance"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Invoice Line Items</span>
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {lineItems.map((item, index) => {
                const selectedProd = products.find(p => p.id === item.productId);
                const isOverStock = invoiceType === 'export' && selectedProd && item.quantity > selectedProd.currentStock;
                const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-800/80 border ${isOverStock ? 'border-rose-600/80 bg-rose-950/20' : 'border-slate-700'} rounded-2xl p-3.5 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:space-x-3`}
                  >
                    {/* Product Selection */}
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Product (SKU)
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} — Current: {p.currentStock} {p.unit} (${p.unitPrice.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div className="w-28">
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Quantity ({selectedProd?.unit || 'units'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                        className={`w-full bg-slate-900 border ${isOverStock ? 'border-rose-500 text-rose-300' : 'border-slate-700 text-slate-200'} text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-500`}
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="w-28">
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Unit Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Line Subtotal */}
                    <div className="w-28 text-right sm:text-right pt-2 sm:pt-0">
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Subtotal
                      </label>
                      <span className="font-mono text-xs font-bold text-emerald-400 block py-1.5">
                        ${lineSubtotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Remove Line Item */}
                    <div className="pt-2 sm:pt-4 text-right sm:text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-30 p-1.5 rounded transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Inline Stock Warning */}
                    {isOverStock && (
                      <div className="text-[11px] text-rose-400 font-medium sm:hidden flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Cannot dispatch {item.quantity}. Only {selectedProd?.currentStock} in stock!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invoice Summary Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-6 text-xs text-slate-400">
              <div>
                <span className="block text-slate-500 text-[10px] uppercase font-bold">Line Items</span>
                <span className="text-sm font-bold text-white font-mono">{lineItems.length} items</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] uppercase font-bold">Total Units</span>
                <span className="text-sm font-bold text-white font-mono">{totalUnits.toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] uppercase font-bold">Total Value</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Processed by: <strong className="text-slate-200">{userProfile.email}</strong></span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Confirmation Warning if Confirm Step Active */}
          {confirmStep && (
            <div className="bg-amber-950/80 border border-amber-700/80 text-amber-200 text-xs rounded-xl p-3.5 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Confirm Transaction Commit</span>
              </div>
              <p>
                You are about to execute an ACID transactional stock modification for <strong>{totalUnits} units</strong>.
                This operation will immediately adjust live catalog inventory and write an immutable audit log.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || validationErrors.length > 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition disabled:opacity-50 cursor-pointer flex items-center space-x-2 ${
                invoiceType === 'import'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isSubmitting ? (
                <span>Executing Transaction...</span>
              ) : confirmStep ? (
                <span>Confirm & Commit {invoiceType.toUpperCase()} Invoice</span>
              ) : (
                <span>Review & Process Invoice</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
