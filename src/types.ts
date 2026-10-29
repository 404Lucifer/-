export type UserRole = 'admin' | 'view_only';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  photoURL?: string;
  createdBy?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  minStockThreshold: number;
  currentStock: number;
  location: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export type InvoiceType = 'import' | 'export';

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  previousStock: number;
  newStock: number;
  unit?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  referenceNumber: string;
  status: 'completed' | 'draft' | 'cancelled';
  createdByUid: string;
  createdByEmail: string;
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  notes: string;
  createdAt: string;
  items?: InvoiceItem[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: 'product' | 'invoice' | 'user' | 'system';
  entityId: string;
  details: string;
}

export interface StockSummaryReport {
  totalSkus: number;
  totalUnits: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalImportsVolume: number;
  totalExportsVolume: number;
  totalImportsValue: number;
  totalExportsValue: number;
}
