import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  runTransaction,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product, Invoice, InvoiceItem, InvoiceType, UserProfile, AuditLog } from '../types';

export interface CreateProductInput {
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  minStockThreshold: number;
  location: string;
  description?: string;
  initialStock?: number;
}

export interface InvoiceItemInput {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
}

export interface ProcessInvoiceInput {
  type: InvoiceType;
  referenceNumber: string;
  notes?: string;
  items: InvoiceItemInput[];
  userProfile: UserProfile;
}

/**
 * Creates a new product in the catalog.
 * CRUCIAL RULE: Direct manual setting of stock is strictly prohibited.
 * If initialStock > 0, it creates the product with currentStock: 0,
 * and programmatically processes a formal Opening Balance Import Invoice!
 */
export async function createProduct(
  input: CreateProductInput,
  userProfile: UserProfile
): Promise<Product> {
  const normalizedSku = input.sku.trim().toUpperCase();

  // Validate SKU uniqueness
  try {
    const q = query(collection(db, 'products'), where('sku', '==', normalizedSku));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error(`A product with SKU "${normalizedSku}" already exists in the catalog.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) throw error;
    handleFirestoreError(error, OperationType.LIST, 'products');
  }

  const productRef = doc(collection(db, 'products'));
  const now = new Date().toISOString();

  const newProduct: Product = {
    id: productRef.id,
    sku: normalizedSku,
    name: input.name.trim(),
    category: input.category.trim(),
    unit: input.unit.trim() || 'Units',
    unitPrice: Number(input.unitPrice) || 0,
    minStockThreshold: Number(input.minStockThreshold) || 0,
    currentStock: 0, // Starts at 0, strictly modified via invoice only
    location: input.location?.trim() || 'General Warehouse',
    description: input.description?.trim() || '',
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(productRef, newProduct);

    // Record product creation audit log
    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      id: auditRef.id,
      timestamp: now,
      userId: userProfile.uid,
      userEmail: userProfile.email,
      action: 'PRODUCT_CREATED',
      entityType: 'product',
      entityId: productRef.id,
      details: `Created product "${newProduct.name}" (SKU: ${newProduct.sku})`
    } satisfies AuditLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${productRef.id}`);
  }

  // If initial stock was specified, generate formal Opening Import Invoice
  const initialQty = Number(input.initialStock);
  if (initialQty > 0) {
    await processInvoiceTransaction({
      type: 'import',
      referenceNumber: `OPENING-BAL-${normalizedSku}`,
      notes: `Initial stock opening balance for SKU ${normalizedSku}`,
      items: [{
        productId: productRef.id,
        sku: normalizedSku,
        productName: newProduct.name,
        quantity: initialQty,
        unitPrice: newProduct.unitPrice,
        unit: newProduct.unit
      }],
      userProfile
    });
    newProduct.currentStock = initialQty;
  }

  return newProduct;
}

/**
 * Updates product catalog metadata (name, category, min threshold, location, stock, etc.).
 */
export async function updateProductMetadata(
  productId: string,
  updates: Partial<Omit<Product, 'id' | 'sku' | 'createdAt'>>,
  userProfile: UserProfile
): Promise<void> {
  const prodRef = doc(db, 'products', productId);
  const now = new Date().toISOString();

  const safeUpdates = {
    ...updates,
    updatedAt: now
  };

  try {
    await setDoc(prodRef, safeUpdates, { merge: true });

    // Record audit log
    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      id: auditRef.id,
      timestamp: now,
      userId: userProfile.uid,
      userEmail: userProfile.email,
      action: 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: productId,
      details: `Administrator updated product metadata for ID ${productId}`
    } satisfies AuditLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}

/**
 * Executes an ACID Transactional Invoice Processing:
 * - Import Invoice: Increases stock levels upon receipt.
 * - Export Invoice: Decreases stock levels upon dispatch, with strict verification
 *   that stock is sufficient. Fails safely if stock < requested dispatch.
 * - Creates invoice and itemized subcollection records.
 * - Writes immutable audit log.
 */
export async function processInvoiceTransaction(
  input: ProcessInvoiceInput
): Promise<Invoice> {
  const { type, referenceNumber, notes, items, userProfile } = input;

  if (!items || items.length === 0) {
    throw new Error('Invoice must contain at least one line item.');
  }

  // Validate quantities
  for (const item of items) {
    if (!item.quantity || item.quantity <= 0) {
      throw new Error(`Quantity for SKU ${item.sku} must be greater than zero.`);
    }
  }

  const now = new Date();
  const invoicePrefix = type === 'import' ? 'INV-IMP' : 'INV-EXP';
  const invoiceNumber = `${invoicePrefix}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const invoiceRef = doc(collection(db, 'invoices'));
  const auditRef = doc(collection(db, 'audit_logs'));

  const processedItems: InvoiceItem[] = [];

  try {
    await runTransaction(db, async (transaction) => {
      // Step 1: Read all product records first (ACID requirement: all reads before writes)
      const productDocs: { ref: any; data: Product }[] = [];

      for (const item of items) {
        const prodRef = doc(db, 'products', item.productId);
        const prodSnapshot = await transaction.get(prodRef);

        if (!prodSnapshot.exists()) {
          throw new Error(`Product with ID "${item.productId}" (SKU: ${item.sku}) was not found.`);
        }

        productDocs.push({
          ref: prodRef,
          data: { id: prodSnapshot.id, ...prodSnapshot.data() } as Product
        });
      }

      // Step 2: Validate stock and compute deltas
      let totalQty = 0;
      let totalAmount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = productDocs[i].data;
        const currentStock = Number(product.currentStock) || 0;

        let newStock = currentStock;

        if (type === 'export') {
          if (currentStock < item.quantity) {
            throw new Error(
              `Insufficient stock for "${product.name}" (SKU: ${item.sku}). ` +
              `Available stock: ${currentStock} ${product.unit || 'units'}, ` +
              `Requested dispatch: ${item.quantity} ${product.unit || 'units'}. ` +
              `Transaction safely aborted with zero stock changes.`
            );
          }
          newStock = currentStock - item.quantity;
        } else {
          // Import
          newStock = currentStock + item.quantity;
        }

        const subtotal = item.quantity * (Number(item.unitPrice) || 0);
        totalQty += item.quantity;
        totalAmount += subtotal;

        processedItems.push({
          invoiceId: invoiceRef.id,
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice) || 0,
          subtotal,
          previousStock: currentStock,
          newStock,
          unit: product.unit
        });
      }

      // Step 3: Perform all writes
      // 3a. Update products currentStock
      for (let i = 0; i < items.length; i++) {
        const prodEntry = productDocs[i];
        const processedItem = processedItems[i];

        transaction.update(prodEntry.ref, {
          currentStock: processedItem.newStock,
          updatedAt: now.toISOString()
        });
      }

      // 3b. Create main invoice document
      const invoiceData: Invoice = {
        id: invoiceRef.id,
        invoiceNumber,
        type,
        referenceNumber: referenceNumber.trim() || 'N/A',
        status: 'completed',
        createdByUid: userProfile.uid,
        createdByEmail: userProfile.email,
        totalItems: items.length,
        totalQuantity: totalQty,
        totalAmount: Number(totalAmount.toFixed(2)),
        notes: notes?.trim() || '',
        createdAt: now.toISOString()
      };

      transaction.set(invoiceRef, invoiceData);

      // 3c. Create invoice line item documents
      for (const item of processedItems) {
        const itemRef = doc(collection(db, `invoices/${invoiceRef.id}/items`));
        item.id = itemRef.id;
        transaction.set(itemRef, item);
      }

      // 3d. Create audit log
      const auditLogData: AuditLog = {
        id: auditRef.id,
        timestamp: now.toISOString(),
        userId: userProfile.uid,
        userEmail: userProfile.email,
        action: `PROCESSED_${type.toUpperCase()}_INVOICE`,
        entityType: 'invoice',
        entityId: invoiceRef.id,
        details: `Processed ${type.toUpperCase()} Invoice ${invoiceNumber} (Ref: ${invoiceData.referenceNumber}) for ${totalQty} units across ${items.length} items.`
      };

      transaction.set(auditRef, auditLogData);
    });

    return {
      id: invoiceRef.id,
      invoiceNumber,
      type,
      referenceNumber: referenceNumber.trim() || 'N/A',
      status: 'completed',
      createdByUid: userProfile.uid,
      createdByEmail: userProfile.email,
      totalItems: items.length,
      totalQuantity: processedItems.reduce((acc, curr) => acc + curr.quantity, 0),
      totalAmount: processedItems.reduce((acc, curr) => acc + curr.subtotal, 0),
      notes: notes || '',
      createdAt: now.toISOString(),
      items: processedItems
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient stock')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `invoices/${invoiceRef.id}`);
  }
}

/**
 * Fetch all invoice items for a given invoice
 */
export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  try {
    const itemsSnapshot = await getDocs(collection(db, `invoices/${invoiceId}/items`));
    return itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvoiceItem));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `invoices/${invoiceId}/items`);
  }
}

/**
 * Deletes a product from the catalog (Supervisor Administrator only).
 */
export async function deleteProduct(
  productId: string,
  sku: string,
  userProfile: UserProfile
): Promise<void> {
  const prodRef = doc(db, 'products', productId);
  const now = new Date().toISOString();

  try {
    await deleteDoc(prodRef);

    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      id: auditRef.id,
      timestamp: now,
      userId: userProfile.uid,
      userEmail: userProfile.email,
      action: 'PRODUCT_DELETED',
      entityType: 'product',
      entityId: productId,
      details: `Administrator deleted product SKU ${sku}`
    } satisfies AuditLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}

/**
 * Updates metadata for an invoice (reference number, notes, status)
 */
export async function updateInvoiceMetadata(
  invoiceId: string,
  updates: { referenceNumber?: string; notes?: string; status?: 'completed' | 'cancelled' },
  userProfile: UserProfile
): Promise<void> {
  const invRef = doc(db, 'invoices', invoiceId);
  const now = new Date().toISOString();

  try {
    await updateDoc(invRef, {
      ...updates,
      updatedAt: now
    });

    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      id: auditRef.id,
      timestamp: now,
      userId: userProfile.uid,
      userEmail: userProfile.email,
      action: 'INVOICE_UPDATED',
      entityType: 'invoice',
      entityId: invoiceId,
      details: `Administrator updated invoice ${invoiceId} metadata`
    } satisfies AuditLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoiceId}`);
  }
}

/**
 * Deletes an invoice with option to reverse stock adjustments atomically.
 */
export async function deleteInvoice(
  invoiceId: string,
  revertStock: boolean,
  userProfile: UserProfile
): Promise<void> {
  const now = new Date().toISOString();

  try {
    const itemsSnapshot = await getDocs(collection(db, `invoices/${invoiceId}/items`));
    const items = itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as InvoiceItem));

    await runTransaction(db, async (transaction) => {
      const invRef = doc(db, 'invoices', invoiceId);
      const invSnap = await transaction.get(invRef);
      if (!invSnap.exists()) {
        throw new Error(`Invoice ${invoiceId} not found.`);
      }
      const invData = invSnap.data() as Invoice;

      if (revertStock) {
        for (const item of items) {
          const prodRef = doc(db, 'products', item.productId);
          const prodSnap = await transaction.get(prodRef);
          if (prodSnap.exists()) {
            const currentStock = Number(prodSnap.data().currentStock) || 0;
            // Reversing an import deducts stock; reversing an export restores stock
            const revertedStock = invData.type === 'import'
              ? Math.max(0, currentStock - item.quantity)
              : currentStock + item.quantity;

            transaction.update(prodRef, {
              currentStock: revertedStock,
              updatedAt: now
            });
          }
        }
      }

      // Delete line items subcollection docs
      for (const item of items) {
        if (item.id) {
          transaction.delete(doc(db, `invoices/${invoiceId}/items`, item.id));
        }
      }

      // Delete invoice doc
      transaction.delete(invRef);

      // Audit log
      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        id: auditRef.id,
        timestamp: now,
        userId: userProfile.uid,
        userEmail: userProfile.email,
        action: 'INVOICE_DELETED',
        entityType: 'invoice',
        entityId: invoiceId,
        details: `Administrator deleted invoice ${invData.invoiceNumber} (Type: ${invData.type}, Stock Reverted: ${revertStock ? 'YES' : 'NO'})`
      } satisfies AuditLog);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `invoices/${invoiceId}`);
  }
}
