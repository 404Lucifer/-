import React, { useState } from 'react';
import {
  UserCheck,
  Shield,
  Eye,
  UserPlus,
  Lock,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { updateUserRole, preCreateUserAccount, deleteUserAccount } from '../services/userService';
import { BOOTSTRAP_ADMIN_EMAIL } from '../firebase';

interface UserManagementViewProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onRefreshUsers: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onRefreshUsers
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('view_only');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRoleChange = async (targetUid: string, targetEmail: string, newRole: UserRole) => {
    if (targetEmail === BOOTSTRAP_ADMIN_EMAIL && newRole !== 'admin') {
      alert('The primary System Administrator cannot be downgraded to View-Only.');
      return;
    }

    try {
      await updateUserRole(targetUid, newRole, currentUser);
      setStatusMessage({ type: 'success', text: `Role for ${targetEmail} updated to ${newRole.toUpperCase()}.` });
      onRefreshUsers();
    } catch (err: any) {
      console.error('Failed to change role:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update role.' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await preCreateUserAccount(inviteEmail.trim(), inviteName.trim(), inviteRole, currentUser);
      setStatusMessage({ type: 'success', text: `Pre-configured account for ${inviteEmail} with role ${inviteRole}.` });
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      onRefreshUsers();
    } catch (err: any) {
      console.error('Failed to invite user:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to register user.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (targetUid: string, targetEmail: string) => {
    if (targetEmail === BOOTSTRAP_ADMIN_EMAIL) {
      alert('The primary System Administrator cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to remove authorized user "${targetEmail}"?`)) {
      return;
    }

    try {
      await deleteUserAccount(targetUid, targetEmail, currentUser);
      setStatusMessage({ type: 'success', text: `User account ${targetEmail} removed from authorized directory.` });
      onRefreshUsers();
    } catch (err: any) {
      console.error('Failed to remove user:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove user.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* RBAC Header & Policy Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Admin Role Scope */}
        <div className="bg-slate-900 border border-indigo-900/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Shield className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-100">Administrator Role Scope</h3>
          </div>
          <p className="text-xs text-slate-400">
            Full operational authorization across the storage system:
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Generate & process Import (Stock In) and Export (Stock Out) Invoices.</li>
            <li>Create new catalog products & perform Excel bulk imports.</li>
            <li>Modify catalog descriptions, thresholds, locations, and pricing.</li>
            <li>Assign and modify user roles (Admin vs View-Only).</li>
            <li>Export real-time reports to Google Sheets and Excel.</li>
          </ul>
        </div>

        {/* View-Only Role Scope */}
        <div className="bg-slate-900 border border-amber-900/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400">
            <Eye className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-100">View-Only Role Scope</h3>
          </div>
          <p className="text-xs text-slate-400">
            Strict read-only oversight for auditors, clients, and warehouse observers:
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Inspect live stock balances, product catalog, and storage locations.</li>
            <li>Review historical transaction invoices and line-item deltas.</li>
            <li>Access low-stock alerts and automated inventory tracking.</li>
            <li>Export reports for compliance reviews.</li>
            <li className="text-amber-300 font-medium">All modification, invoice creation, and user management controls are disabled.</li>
          </ul>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Authorized User Directory ({users.length} Users)</span>
          </h3>
          <p className="text-xs text-slate-400">Manage role assignments and grant privileges</p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add / Assign User</span>
        </button>
      </div>

      {/* Status Feedback */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-800 text-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950 uppercase text-[11px] font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Registration Date</th>
                <th className="py-3 px-4 text-center">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => {
                const isBootstrapAdmin = u.email === BOOTSTRAP_ADMIN_EMAIL;
                const isCurrent = u.uid === currentUser.uid;

                return (
                  <tr key={u.uid} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-medium text-slate-100 flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs uppercase border border-slate-700">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          (u.displayName || u.email || 'U').charAt(0)
                        )}
                      </div>
                      <div>
                        <span>{u.displayName || u.email.split('@')[0]}</span>
                        {isCurrent && (
                          <span className="ml-1.5 text-[10px] text-indigo-400 font-semibold">(You)</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                      {u.email}
                      {isBootstrapAdmin && (
                        <span className="ml-2 text-[10px] bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 px-1.5 py-0.5 rounded font-sans">
                          Bootstrap SuperAdmin
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800/80 px-2.5 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-2.5 py-0.5 rounded-full">
                          <Eye className="w-3 h-3" />
                          <span>View-Only</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isBootstrapAdmin ? (
                        <span className="text-[11px] text-slate-500 italic flex items-center justify-center space-x-1">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Permanent</span>
                        </span>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, u.email, e.target.value as UserRole)}
                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="admin">Admin</option>
                            <option value="view_only">View-Only</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.uid, u.email)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                            title="Remove user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite / Pre-Create User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Assign User Account & Role</span>
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Role Assignment <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setInviteRole('admin')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      inviteRole === 'admin'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole('view_only')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      inviteRole === 'view_only'
                        ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>View-Only</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-2 text-slate-400 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Authorize Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
