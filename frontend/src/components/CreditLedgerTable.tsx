import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Clock, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface LedgerEntry {
  _id: string;
  amount: number;
  balanceAfter: number;
  action: 'added' | 'deducted';
  reason: string;
  createdAt: string;
}

export const CreditLedgerTable = () => {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLedger = async (p: number) => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await axios.get(`${API_BASE}/credits/ledger?page=${p}&limit=10`, { withCredentials: true });
      setLedger(res.data.ledger || []);
      setTotalPages(res.data.pages || 1);
    } catch (e) {
      console.error('Failed to fetch credit ledger', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(page);
  }, [page]);

  return (
    <div className="mt-12 border-t border-border/40 pt-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Receipt size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Credit Ledger</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Track your credit usage and top-ups</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-bold">
              <tr>
                <th className="px-5 py-4 border-b border-border/40">Transaction</th>
                <th className="px-5 py-4 border-b border-border/40">Date</th>
                <th className="px-5 py-4 border-b border-border/40">Amount</th>
                <th className="px-5 py-4 border-b border-border/40">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading && ledger.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Loading ledger...</td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No credit history found.</td>
                </tr>
              ) : (
                ledger.map((entry) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    key={entry._id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          entry.action === 'added' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        )}>
                          {entry.action === 'added' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <span className="font-semibold text-foreground text-xs md:text-sm">{entry.reason}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "font-mono font-bold",
                        entry.action === 'added' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {entry.action === 'added' ? '+' : '-'}{entry.amount}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-muted-foreground font-medium">
                      {entry.balanceAfter} cr
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-border/40 bg-muted/20 flex items-center justify-between">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="text-xs font-bold text-foreground disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs text-muted-foreground font-medium">Page {page} of {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-xs font-bold text-foreground disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
