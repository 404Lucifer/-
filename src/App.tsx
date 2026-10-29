/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  db,
  auth,
  initAuth,
  googleSignIn,
  logoutUser,
  getCachedAccessToken,
  setCachedAccessToken,
  handleFirestoreError,
  OperationType,
  BOOTSTRAP_ADMIN_EMAIL
} from './firebase';
import { Product, Invoice, AuditLog, UserProfile, UserRole } from './types';
import { syncUserProfile, fetchAllUsers } from './services/userService';
import { deleteProduct } from './services/inventoryService';

import { Navbar } from './components/Navbar';
import { InventoryView } from './components/InventoryView';
import { InvoicesView } from './components/InvoicesView';
import { ReportsView } from './components/ReportsView';
import { UserManagementView } from './components/UserManagementView';
import { AuditLogsView } from './components/AuditLogsView';
import { AuthScreen } from './components/AuthScreen';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { AddProductModal } from './components/AddProductModal';
import { BulkImportModal } from './components/BulkImportModal';
import { EditProductModal } from './components/EditProductModal';
import { Database, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Core Data Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Navigation and Modals State
  const [activeTab, setActiveTab] = useState<'inventory' | 'invoices' | 'reports' | 'users' | 'audit'>('inventory');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalType, setInvoiceModalType] = useState<'import' | 'export'>('import');
  const [invoiceModalProductId, setInvoiceModalProductId] = useState<string | undefined>(undefined);

  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        if (token) setAccessToken(token);
        try {
          const profile = await syncUserProfile(user);
          setUserProfile(profile);
        } catch (e) {
          console.error('Failed syncing user profile:', e);
        } finally {
          setIsAuthChecking(false);
        }
      },
      () => {
        setCurrentUser(null);
        setUserProfile(null);
        setAccessToken(null);
        setIsAuthChecking(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Listen for Real-Time Firestore Collections once authenticated
  useEffect(() => {
    if (!userProfile) return;

    // 1. Products Listener
    const qProducts = query(collection(db, 'products'), orderBy('sku', 'asc'));
    const unsubProducts = onSnapshot(
      qProducts,
      (snapshot) => {
        const prods = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        setProducts(prods);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    // 2. Invoices Listener
    const qInvoices = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    const unsubInvoices = onSnapshot(
      qInvoices,
      (snapshot) => {
        const invs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice));
        setInvoices(invs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'invoices');
      }
    );

    // 3. Audit Logs Listener
    const qAudit = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsubAudit = onSnapshot(
      qAudit,
      (snapshot) => {
        const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
        setAuditLogs(logs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      }
    );

    // 4. Users Listener (if Admin)
    let unsubUsers = () => {};
    if (userProfile.role === 'admin') {
      const qUsers = collection(db, 'users');
      unsubUsers = onSnapshot(
        qUsers,
        (snapshot) => {
          const uList = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
          setAllUsers(uList);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      );
    }

    return () => {
      unsubProducts();
      unsubInvoices();
      unsubAudit();
      unsubUsers();
    };
  }, [userProfile]);

  // Handle Auth Completion from AuthScreen
  const handleAuthComplete = async (user: any, token: string | null) => {
    setCurrentUser(user);
    if (token) {
      setAccessToken(token);
      setCachedAccessToken(token);
    }

    try {
      const profile = await syncUserProfile(user);
      setUserProfile(profile);
    } catch (e) {
      console.error('Error on auth complete:', e);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
    setAccessToken(null);
  };

  const handleConnectGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setAccessToken(result.accessToken);
        setCachedAccessToken(result.accessToken);
        alert('Google Sheets connection verified!');
      }
    } catch (e: any) {
      console.error('Error connecting Google Sheets:', e);
      alert('Failed to connect Google account: ' + e.message);
    }
  };

  // Open Invoice modal with custom defaults
  const handleOpenCreateInvoice = (type: 'import' | 'export' = 'import', prodId?: string) => {
    setInvoiceModalType(type);
    setInvoiceModalProductId(prodId);
    setIsInvoiceModalOpen(true);
  };

  // Extract categories for modals
  const existingCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono">Initializing StockVault System Security...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <AuthScreen onAuthComplete={handleAuthComplete} />;
  }

  const isAdmin = userProfile.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        userProfile={userProfile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateInvoice={handleOpenCreateInvoice}
        onOpenAddProduct={() => setIsAddProductModalOpen(true)}
        onSignOut={handleSignOut}
        hasGoogleToken={Boolean(accessToken)}
        onConnectGoogle={handleConnectGoogle}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Empty Catalog Prompt */}
        {products.length === 0 && isAdmin && (
          <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/70 border border-indigo-800/80 rounded-3xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Warehouse Catalog is Currently Empty
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto mt-1">
                Begin managing your warehouse by adding products manually or uploading a bulk product spreadsheet (.xlsx/.csv). Initial stock levels can be credited via opening import invoices.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsAddProductModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition cursor-pointer flex items-center space-x-2"
              >
                <span>+ Add Product Manually</span>
              </button>
              <button
                onClick={() => setIsBulkImportModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                Upload Excel / CSV
              </button>
            </div>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            invoices={invoices}
            userProfile={userProfile}
            onOpenAddProduct={() => setIsAddProductModalOpen(true)}
            onOpenBulkImport={() => setIsBulkImportModalOpen(true)}
            onOpenCreateInvoice={handleOpenCreateInvoice}
            onEditProductMetadata={(prod) => setEditingProduct(prod)}
            onDeleteProduct={async (id, sku) => {
              if (userProfile) {
                await deleteProduct(id, sku, userProfile);
              }
            }}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            invoices={invoices}
            userProfile={userProfile}
            onOpenCreateInvoice={handleOpenCreateInvoice}
            isAdmin={isAdmin}
            onInvoiceUpdated={() => {}}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            products={products}
            invoices={invoices}
            auditLogs={auditLogs}
            userProfile={userProfile}
            hasGoogleToken={Boolean(accessToken)}
            accessToken={accessToken}
            onConnectGoogle={handleConnectGoogle}
            onOpenCreateInvoice={handleOpenCreateInvoice}
          />
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManagementView
            users={allUsers}
            currentUser={userProfile}
            onRefreshUsers={async () => {
              const uList = await fetchAllUsers();
              setAllUsers(uList);
            }}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogsView auditLogs={auditLogs} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>StockVault Storage & Inventory Management System</span>
          <span className="font-mono text-[11px] text-slate-600">
            Audit Standard ISO/IEC 27001 & ACID Firestore Protocol
          </span>
        </div>
      </footer>

      {/* Transactional Invoice Modal */}
      {isInvoiceModalOpen && (
        <CreateInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          products={products}
          userProfile={userProfile}
          initialType={invoiceModalType}
          initialProductId={invoiceModalProductId}
          onInvoiceCreated={() => {}}
        />
      )}

      {/* Add Product Modal */}
      {isAddProductModalOpen && (
        <AddProductModal
          isOpen={isAddProductModalOpen}
          onClose={() => setIsAddProductModalOpen(false)}
          userProfile={userProfile}
          existingCategories={existingCategories}
          onProductCreated={() => {}}
        />
      )}

      {/* Bulk Excel Import Modal */}
      {isBulkImportModalOpen && (
        <BulkImportModal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          products={products}
          userProfile={userProfile}
          onImportComplete={() => {}}
        />
      )}

      {/* Edit Product Metadata Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          userProfile={userProfile}
          existingCategories={existingCategories}
          onProductUpdated={() => {}}
          onProductDeleted={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}
