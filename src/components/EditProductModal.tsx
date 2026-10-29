import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  X,
  AlertTriangle,
  Edit2,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { Product, UserProfile } from '../types';
import { updateProductMetadata, deleteProduct } from '../services/inventoryService';

interface EditProductModalProps {
  product: Product | null;
  onClose: () => void;
  userProfile: UserProfile;
  existingCategories: string[];
  onProductUpdated: () => void;
  onProductDeleted?: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  userProfile,
  existingCategories,
  onProductUpdated,
  onProductDeleted
}) => {
  if (!product) return null;

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [unit, setUnit] = useState(product.unit);
  const [unitPrice, setUnitPrice] = useState<number>(product.unitPrice);
  const [minStockThreshold, setMinStockThreshold] = useState<number>(product.minStockThreshold);
  const [currentStock, setCurrentStock] = useState<number>(product.currentStock);
  const [location, setLocation] = useState(product.location);
  const [description, setDescription] = useState(product.description || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProductMetadata(
        product.id,
        {
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          unitPrice: Number(unitPrice) || 0,
          minStockThreshold: Number(minStockThreshold) || 0,
          currentStock: Number(currentStock) || 0,
          location: location.trim(),
          description: description.trim()
        },
        userProfile
      );

      onProductUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to update product:', err);
      setErrorMessage(err.message || 'Failed to update catalog metadata.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteProduct(product.id, product.sku, userProfile);
      if (onProductDeleted) onProductDeleted();
      onProductUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      setErrorMessage(err.message || 'Failed to delete product.');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600/20 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/30">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Edit Catalog Details</h2>
                <span className="font-mono text-xs font-bold bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700">
                  {product.sku}
                </span>
              </div>
              <p className="text-xs text-slate-400">Update descriptive metadata without violating stock locks</p>
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
          {/* Stock Count Edit for Supervisor Admin */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-950/60 p-2 rounded-xl text-indigo-400 border border-indigo-800/60">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <span className="text-xs text-slate-300 font-semibold block">Current Stock Quantity ({unit}):</span>
                <span className="text-[11px] text-slate-500">Supervisor administrator adjustment authority</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                className="w-28 bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-right"
              />
              <span className="text-xs text-slate-400">{unit}</span>
            </div>
          </div>

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Unit, Price, Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Unit of Measure
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

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
          </div>

          {/* Location & Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Storage Location / Bin
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description & Specifications
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                confirmDelete
                  ? 'bg-rose-600 text-white hover:bg-rose-500 shadow'
                  : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmDelete ? 'Confirm Permanent Delete' : 'Delete Product'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition cursor-pointer disabled:opacity-50 flex items-center space-x-2"
              >
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
