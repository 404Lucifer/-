import React from 'react';
import {
  Boxes,
  Shield,
  Eye,
  LogOut,
  FileSpreadsheet,
  FileText,
  UserCheck,
  History,
  PlusCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  userProfile: UserProfile | null;
  activeTab: 'inventory' | 'invoices' | 'reports' | 'users' | 'audit';
  setActiveTab: (tab: 'inventory' | 'invoices' | 'reports' | 'users' | 'audit') => void;
  onOpenCreateInvoice: (defaultType?: 'import' | 'export') => void;
  onOpenAddProduct: () => void;
  onSignOut: () => void;
  hasGoogleToken: boolean;
  onConnectGoogle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  activeTab,
  setActiveTab,
  onOpenCreateInvoice,
  onOpenAddProduct,
  onSignOut,
  hasGoogleToken,
  onConnectGoogle
}) => {
  const isAdmin = userProfile?.role === 'admin';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      {/* Top Banner with System Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-inner flex items-center justify-center text-white">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">StockVault</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full">
                  Audit Controlled
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Storage & Inventory Management System</p>
            </div>
          </div>

          {/* Quick Actions & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Google Sheets Status */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 border border-slate-700">
              <FileSpreadsheet className={`w-3.5 h-3.5 ${hasGoogleToken ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-slate-300">Google Sheets:</span>
              {hasGoogleToken ? (
                <span className="text-emerald-400 flex items-center space-x-1">
                  <span>Connected</span>
                </span>
              ) : (
                <button
                  onClick={onConnectGoogle}
                  className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  Link
                </button>
              )}
            </div>

            {/* Admin Quick Action Buttons */}
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenCreateInvoice('import')}
                  className="hidden lg:inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
                  title="Create Import Invoice (Stock In)"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Import Stock</span>
                </button>

                <button
                  onClick={() => onOpenCreateInvoice('export')}
                  className="hidden lg:inline-flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
                  title="Create Export Invoice (Stock Out)"
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5" />
                  <span>Export Stock</span>
                </button>

                <button
                  onClick={onOpenAddProduct}
                  className="hidden sm:inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Product</span>
                </button>
              </div>
            )}

            {/* User Profile & Role Indicator */}
            <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 uppercase overflow-hidden border border-slate-600">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  (userProfile?.displayName || userProfile?.email || 'U').charAt(0)
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {userProfile?.displayName || userProfile?.email?.split('@')[0]}
                </div>
                <div className="flex items-center space-x-1">
                  {isAdmin ? (
                    <span className="inline-flex items-center text-[10px] font-bold text-indigo-400">
                      <Shield className="w-2.5 h-2.5 mr-0.5" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-semibold text-amber-400">
                      <Eye className="w-2.5 h-2.5 mr-0.5" /> View-Only
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-slate-800/80 pt-1 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'inventory'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Inventory Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'invoices'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices & Stock Moves</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'reports'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Reports & Exports</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'users'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>User Roles (RBAC)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'audit'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
