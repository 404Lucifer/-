import React, { useState } from 'react';
import {
  Boxes,
  PlusCircle,
  AlertTriangle,
  Lock,
  X,
  FileCheck2,
  Tag,
  MapPin,
  DollarSign
} from 'lucide-react';
import { UserProfile } from '../types';
import { createProduct, CreateProductInput } from '../services/inventoryService';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  existingCategories: string[];
  onProductCreated: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  existingCategories,
  onProductCreated
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(existingCategories[0] || 'Electronics');
  const [customCategory, setCustomCategory] = useState('');
  const [unit, setUnit] = useState('Units');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [minStockThreshold, setMinStockThreshold] = useState<number>(10);
  const [location, setLocation] = useState('Warehouse A - Section 1');
  const [description, setDescription] = useState('');
  const [initialStock, setInitialStock] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const finalCategory = category === 'CUSTOM' ? customCategory.trim() : category;

    if (!sku.trim()) {
      setErrorMessage('SKU code is required.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }
    if (!finalCategory) {
      setErrorMessage('Please select or specify a category.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProductInput = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category: finalCategory,
        unit: unit.trim() || 'Units',
        unitPrice: Number(unitPrice) || 0,
        minStockThreshold: Number(minStockThreshold) || 0,
        location: location.trim(),
        description: description.trim(),
        initialStock: Number(initialStock) || 0
      };

      await createProduct(payload, userProfile);
      onProductCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create product:', err);
      setErrorMessage(err.message || 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600/20 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/30">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Catalog Product</h2>
              <p className="text-xs text-slate-400">Register new inventory item in the storage system</p>
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
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* SKU & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SKU Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. ELEC-PWR-001"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 12V 5A Power Supply Adapter"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {existingCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Raw Materials">Raw Materials</option>
                <option value="Electronics">Electronics</option>
                <option value="Packaging">Packaging</option>
                <option value="Hardware">Hardware</option>
                <option value="Chemicals">Chemicals</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="CUSTOM">+ New Category...</option>
              </select>
              {category === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  placeholder="Enter new category name..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Unit of Measure
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Units, Kg, Liters, Boxes, Reels..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Pricing, Min Threshold, Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Min Stock Alert Threshold
              </label>
              <input
                type="number"
                min="0"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Storage Bin / Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Rack 02 - Shelf B"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Product Description & Specifications
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Manufacturer details, batch specifications, handling instructions..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Crucial Rule Audit Box: Initial Stock */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Opening Stock Quantity</span>
              </label>
              <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                Opening Balance Workflow
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-36 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 leading-snug">
                {initialStock > 0 ? (
                  <span className="text-emerald-300 font-medium">
                    An automated Opening Balance Import Invoice (Ref: OPENING-BAL-{sku || 'SKU'}) will be generated upon creation to uphold strict audit integrity.
                  </span>
                ) : (
                  <span>Product will start with 0 stock. Stock can then be received via standard Import Invoices.</span>
                )}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition cursor-pointer disabled:opacity-50 flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
