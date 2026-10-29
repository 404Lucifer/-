import React, { useState } from 'react';
import {
  History,
  Search,
  Shield,
  Filter,
  CheckCircle2,
  Lock,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  UserCheck
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsViewProps {
  auditLogs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ auditLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'invoice' | 'product' | 'user'>('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityId && log.entityId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;

    return matchesSearch && matchesEntity;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('IMPORT')) {
      return (
        <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-950/80 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <ArrowDownToLine className="w-2.5 h-2.5" />
          <span>IMPORT MOVEMENT</span>
        </span>
      );
    }
    if (action.includes('EXPORT')) {
      return (
        <span className="inline-flex items-center space-x-1 text-rose-400 bg-rose-950/80 border border-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <ArrowUpFromLine className="w-2.5 h-2.5" />
          <span>EXPORT DISPATCH</span>
        </span>
      );
    }
    if (action.includes('PRODUCT')) {
      return (
        <span className="inline-flex items-center space-x-1 text-indigo-400 bg-indigo-950/80 border border-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Boxes className="w-2.5 h-2.5" />
          <span>CATALOG EVENT</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 text-amber-400 bg-amber-950/80 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
        <UserCheck className="w-2.5 h-2.5" />
        <span>SECURITY EVENT</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600/20 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>System-Wide Immutable Audit Trail</span>
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
            </h3>
            <p className="text-xs text-slate-400">
              Chronological log of all transactional movements, catalog alterations, and permission revisions.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 shrink-0">
          {auditLogs.length} Records Logged
        </span>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, administrator email, entity ID, or keyword..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Entity Filter Pills */}
        <div className="flex items-center space-x-2 shrink-0 text-xs">
          <button
            onClick={() => setEntityFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              entityFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => setEntityFilter('invoice')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              entityFilter === 'invoice'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setEntityFilter('product')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              entityFilter === 'product'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setEntityFilter('user')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              entityFilter === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Users & Roles
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950 uppercase text-[11px] font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor (Email)</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                    <History className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-medium text-slate-400">No audit records match filters</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {log.userEmail}
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] text-slate-400">
                      <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-xs text-slate-300">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
