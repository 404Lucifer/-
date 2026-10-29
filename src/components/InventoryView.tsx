import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Filter,
  PlusCircle,
  Upload,
  AlertTriangle,
  Lock,
  ArrowUpDown,
  Info,
  CheckCircle2,
  XCircle,
  FileText,
  MapPin,
  Tag,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  Edit2,
  Trash2
} from 'lucide-react';
import { Product, UserProfile, Invoice } from '../types';

interface InventoryViewProps {
  products: Product[];
  invoices: Invoice[];
  userProfile: UserProfile | null;
  onOpenAddProduct: () => void;
  onOpenBulkImport: () => void;
  onOpenCreateInvoice: (defaultType?: 'import' | 'export', defaultProductId?: string) => void;
  onEditProductMetadata: (product: Product) => void;
  onDeleteProduct?: (productId: string, sku: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  invoices,
  userProfile,
  onOpenAddProduct,
  onOpenBulkImport,
  onOpenCreateInvoice,
  onEditProductMetadata,
  onDeleteProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'instock' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'stock' | 'valuation'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const isAdmin = userProfile?.role === 'admin';

  // Get unique categories
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory =
          selectedCategory === 'all' || p.category === selectedCategory;

        let matchesStock = true;
        if (stockFilter === 'low') {
          matchesStock = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
        } else if (stockFilter === 'out') {
          matchesStock = p.currentStock === 0;
        } else if (stockFilter === 'instock') {
          matchesStock = p.currentStock > p.minStockThreshold;
        }

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'name') comp = a.name.localeCompare(b.name);
        else if (sortBy === 'sku') comp = a.sku.localeCompare(b.sku);
        else if (sortBy === 'stock') comp = a.currentStock - b.currentStock;
        else if (sortBy === 'valuation') comp = a.currentStock * a.unitPrice - b.currentStock * b.unitPrice;

        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [products, searchTerm, selectedCategory, stockFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'sku' | 'stock' | 'valuation') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Strict Audit Constraint Rule Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border border-amber-600/40 rounded-2xl p-4 sm:p-5 text-amber-200 shadow-sm">
        <div className="flex items-start space-x-3">
          <div className="bg-amber-600/20 p-2 rounded-xl text-amber-400 mt-0.5 border border-amber-500/30 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm sm:text-base text-amber-100">
                Core Inventory Integrity Rule (Zero Manual Quantity Edits)
              </h3>
              <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                Enforced
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-300/90 mt-1 leading-relaxed">
              Direct manual modification of stock quantities is strictly prohibited by system architecture.
              Stock levels adjust <strong>exclusively</strong> via verified transactional workflows:
              <span className="text-emerald-300 font-medium"> Import Invoices</span> (Stock In / Receipt) or
              <span className="text-rose-300 font-medium"> Export Invoices</span> (Stock Out / Dispatch).
              Every movement generates an immutable audit record.
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and Action Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input for Name or SKU */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by Name or SKU (e.g. ELEC-MICRO or Cortex)..."
              className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-slate-700/60 transition cursor-pointer"
                title="Clear search"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {isAdmin ? (
              <>
                <button
                  onClick={onOpenAddProduct}
                  className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
                <button
                  onClick={onOpenBulkImport}
                  className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Bulk Import (Excel/CSV)</span>
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-400 italic bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
                View-Only Mode: Modification controls restricted to Administrators.
              </div>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center space-x-1 text-slate-400 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Status:</span>
          </div>

          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
              stockFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Products ({products.length})
          </button>

          <button
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-750'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock ({products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStockThreshold).length})</span>
          </button>

          <button
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              stockFilter === 'out'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-rose-400 hover:bg-slate-750'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Out of Stock ({products.filter(p => p.currentStock === 0).length})</span>
          </button>

          <button
            onClick={() => setStockFilter('instock')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              stockFilter === 'instock'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-emerald-400 hover:bg-slate-750'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Optimal Stock ({products.filter(p => p.currentStock > p.minStockThreshold).length})</span>
          </button>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <div className="ml-auto flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active Search Filter Badge */}
        {searchTerm.trim() && (
          <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-800/60 rounded-xl px-3 py-1.5 text-xs text-indigo-300">
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Filtering by Name or SKU: <strong className="text-white font-mono">"{searchTerm}"</strong>
              </span>
              <span className="text-indigo-400 font-semibold">({filteredProducts.length} matched)</span>
            </div>
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-indigo-300 hover:text-white underline cursor-pointer"
            >
              Reset search
            </button>
          </div>
        )}
      </div>

      {/* Inventory Catalog Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => toggleSort('sku')}>
                  <div className="flex items-center space-x-1">
                    <span>SKU Code</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => toggleSort('name')}>
                  <div className="flex items-center space-x-1">
                    <span>Product Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Storage Location</th>
                <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-200" onClick={() => toggleSort('stock')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Current Stock</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Min Threshold</th>
                <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-200" onClick={() => toggleSort('valuation')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Valuation ($)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Boxes className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-medium text-slate-400">No inventory products found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {products.length === 0
                        ? 'Catalog is empty. Add a product manually, bulk import an Excel file, or seed demo catalog.'
                        : 'Try adjusting your search criteria or filter options.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.currentStock === 0;
                  const isLowStock = !isOutOfStock && p.currentStock <= p.minStockThreshold;
                  const totalVal = p.currentStock * p.unitPrice;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/60 transition group cursor-pointer"
                      onClick={() => setSelectedProduct(p)}
                    >
                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100 text-xs">
                        <span className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/50">
                          {p.sku}
                        </span>
                      </td>

                      {/* Name & Description */}
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        <div className="font-semibold text-slate-100">{p.name}</div>
                        {p.description && (
                          <div className="text-xs text-slate-400 truncate max-w-xs">{p.description}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full border border-slate-700">
                          {p.category}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-xs text-slate-400 flex items-center space-x-1 pt-4">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{p.location || 'Warehouse Main'}</span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                        <span className="text-base font-mono">{p.currentStock.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 ml-1 font-normal">{p.unit}</span>
                      </td>

                      {/* Min Threshold */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-400">
                        {p.minStockThreshold.toLocaleString()} {p.unit}
                      </td>

                      {/* Total Valuation */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-200">
                        ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <div className="text-[10px] text-slate-500">${p.unitPrice.toFixed(2)}/unit</div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center space-x-1 bg-rose-950/80 text-rose-300 border border-rose-800/80 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Out of Stock</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center space-x-1 bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[11px] font-semibold px-2.5 py-1 rounded-full animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Optimal</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => onOpenCreateInvoice('import', p.id)}
                                title="Import Stock (Receipt Invoice)"
                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-900/40 hover:text-emerald-300 transition cursor-pointer"
                              >
                                <ArrowDownToLine className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenCreateInvoice('export', p.id)}
                                title="Export Stock (Dispatch Invoice)"
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-900/40 hover:text-rose-300 transition cursor-pointer"
                              >
                                <ArrowUpFromLine className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onEditProductMetadata(p)}
                                title="Edit Product Details & Stock"
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-indigo-300 transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteProduct && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to permanently delete product "${p.name}" (SKU: ${p.sku})?`)) {
                                      onDeleteProduct(p.id, p.sku);
                                    }
                                  }}
                                  title="Delete Product"
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedProduct(p)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Modal / Drawer */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono bg-indigo-900/60 text-indigo-300 border border-indigo-700 px-2.5 py-0.5 rounded text-xs font-bold">
                    {selectedProduct.sku}
                  </span>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">{selectedProduct.category}</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">{selectedProduct.name}</h3>
                {selectedProduct.description && (
                  <p className="text-xs text-slate-400 mt-1">{selectedProduct.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Inventory Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                <span className="text-slate-400 text-xs block">Current Stock</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {selectedProduct.currentStock} {selectedProduct.unit}
                </span>
                <span className="text-[10px] text-amber-400 block mt-0.5">
                  Min: {selectedProduct.minStockThreshold} {selectedProduct.unit}
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                <span className="text-slate-400 text-xs block">Unit Price</span>
                <span className="text-xl font-bold font-mono text-slate-200 mt-1 block">
                  ${selectedProduct.unitPrice.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Standard Valuation</span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                <span className="text-slate-400 text-xs block">Total Value</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  ${(selectedProduct.currentStock * selectedProduct.unitPrice).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Asset in storage</span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                <span className="text-slate-400 text-xs block">Location</span>
                <span className="text-sm font-semibold text-slate-200 mt-1 block truncate">
                  {selectedProduct.location || 'Warehouse A'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Bin / Shelf</span>
              </div>
            </div>

            {/* Strict Notice regarding modification */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 flex items-center space-x-3">
              <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-300">Audited Stock Metric: </span>
                This product quantity is cryptographically bound to verified Invoices. To increase or decrease inventory, generate a formal Import or Export Invoice.
              </div>
            </div>

            {/* Quick Actions for Admin */}
            {isAdmin && (
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => {
                    const prodId = selectedProduct.id;
                    setSelectedProduct(null);
                    onOpenCreateInvoice('import', prodId);
                  }}
                  className="flex-1 inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Generate Import Invoice (+Stock)</span>
                </button>

                <button
                  onClick={() => {
                    const prodId = selectedProduct.id;
                    setSelectedProduct(null);
                    onOpenCreateInvoice('export', prodId);
                  }}
                  className="flex-1 inline-flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  <span>Generate Export Invoice (-Stock)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
