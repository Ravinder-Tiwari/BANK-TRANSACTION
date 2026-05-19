import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import { Search, Filter, Download } from 'lucide-react';

const Transactions = () => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, typeFilter],
    queryFn: async () => {
      const response = await axiosInstance.get(`/transactions?page=${page}&type=${typeFilter}`);
      return response.data;
    },
  });

  const transactions = data?.transactions || [];

  // Utility function to export CSV
  const exportToCSV = () => {
    const csvContent = [
      ['Transaction ID', 'Date & Time', 'Description', 'Account', 'Status', 'Amount'],
      ...transactions.map(tx => [
        tx.id,
        tx.date,
        tx.description,
        tx.account,
        tx.status,
        `${tx.type === 'credit' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}`
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Transactions Ledger</h1>
          <p className="text-slate-400 text-sm mt-1">Track and manage all your banking activities</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID or description..." 
              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-black/20 border border-white/10 rounded-lg py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all" className="bg-[#0B0F19]">All Types</option>
                <option value="credit" className="bg-[#0B0F19]">Credits Only</option>
                <option value="debit" className="bg-[#0B0F19]">Debits Only</option>
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Transaction ID</th>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Account</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Loading transactions...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No transactions found.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{tx.id}</td>
                    <td className="px-6 py-4 text-slate-400">{tx.date}</td>
                    <td className="px-6 py-4 font-medium text-white">{tx.description}</td>
                    <td className="px-6 py-4 text-slate-400">{tx.account}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${tx.type === 'credit' ? 'text-emerald-400' : 'text-white'}`}>
                      {tx.type === 'credit' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-sm">
          <span className="text-slate-400">Showing page {page}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
