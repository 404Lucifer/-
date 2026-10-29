import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, BOOTSTRAP_ADMIN_EMAIL } from '../firebase';
import { UserProfile, UserRole, AuditLog } from '../types';

/**
 * Retrieves or initializes the user profile in Firestore.
 * Automatically gives Super Admin role to the designated system admin email.
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();

  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      // Force admin role for the bootstrap email even if historically altered
      if (user.email === BOOTSTRAP_ADMIN_EMAIL && data.role !== 'admin') {
        await updateDoc(userRef, { role: 'admin' });
        return { ...data, role: 'admin' };
      }
      return data;
    }

    // New user registration
    // Check if this is the very first user in the system or the bootstrapped admin
    let assignedRole: UserRole = 'view_only';
    if (user.email === BOOTSTRAP_ADMIN_EMAIL) {
      assignedRole = 'admin';
    } else {
      const allUsers = await getDocs(collection(db, 'users'));
      if (allUsers.empty) {
        assignedRole = 'admin'; // First user gets admin
      }
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || 'user@system.local',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      role: assignedRole,
      photoURL: user.photoURL || undefined,
      createdAt: now
    };

    await setDoc(userRef, newProfile);

    // Record audit log
    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      id: auditRef.id,
      timestamp: now,
      userId: user.uid,
      userEmail: newProfile.email,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: user.uid,
      details: `User registered with initial role: ${assignedRole}`
    } satisfies AuditLog);

    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }
}

/**
 * Fetch all registered users in the system (Admin only)
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((d) => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

/**
 * Updates a user's role (Admin vs View-Only).
 * Admin only capability.
 */
export async function updateUserRole(
  targetUid: string,
  newRole: UserRole,
  adminProfile: UserProfile
): Promise<void> {
  const userRef = doc(db, 'users', targetUid);
  const now = new Date().toISOString();

  try {
    await updateDoc(userRef, { role: newRole });

    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      id: auditRef.id,
      timestamp: now,
      userId: adminProfile.uid,
      userEmail: adminProfile.email,
      action: 'ROLE_MODIFIED',
      entityType: 'user',
      entityId: targetUid,
      details: `Updated role of user ${targetUid} to "${newRole}"`
    } satisfies AuditLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
  }
}

/**
 * Pre-creates or invites a user profile so their role is established
 */
export async function preCreateUserAccount(
  email: string,
  displayName: string,
  role: UserRole,
  adminProfile: UserProfile
): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  // Generate deterministic ID or query
  const syntheticUid = 'pre_' + btoa(normalizedEmail).replace(/=/g, '').toLowerCase().slice(0, 20);
  const userRef = doc(db, 'users', syntheticUid);
  const now = new Date().toISOString();

  const newProfile: UserProfile = {
    uid: syntheticUid,
    email: normalizedEmail,
    displayName: displayName.trim() || normalizedEmail.split('@')[0],
    role,
    createdAt: now,
    createdBy: adminProfile.email
  };

  try {
    await setDoc(userRef, newProfile);

    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      id: auditRef.id,
      timestamp: now,
      userId: adminProfile.uid,
      userEmail: adminProfile.email,
      action: 'USER_INVITED',
      entityType: 'user',
      entityId: syntheticUid,
      details: `Invited user ${normalizedEmail} with role "${role}"`
    } satisfies AuditLog);

    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${syntheticUid}`);
  }
}

/**
 * Removes a user account from authorized directory (Admin only).
 * Cannot delete the primary bootstrap administrator.
 */
export async function deleteUserAccount(
  targetUid: string,
  targetEmail: string,
  adminProfile: UserProfile
): Promise<void> {
  if (targetEmail === BOOTSTRAP_ADMIN_EMAIL) {
    throw new Error('The primary bootstrap administrator cannot be deleted.');
  }

  const userRef = doc(db, 'users', targetUid);
  const now = new Date().toISOString();

  try {
    await deleteDoc(userRef);

    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      id: auditRef.id,
      timestamp: now,
      userId: adminProfile.uid,
      userEmail: adminProfile.email,
      action: 'USER_REMOVED',
      entityType: 'user',
      entityId: targetUid,
      details: `Removed user account ${targetEmail}`
    } satisfies AuditLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${targetUid}`);
  }
}
