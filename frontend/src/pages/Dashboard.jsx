import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign, Send } from 'lucide-react';

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [transferData, setTransferData] = useState({ toAccount: '', amount: '' });
  const [transferError, setTransferError] = useState('');

  // Fetch Dashboard Stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await axiosInstance.get('/analytics/dashboard');
      return response.data;
    },
  });

  // Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post('/transactions/transfer', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setTransferData({ toAccount: '', amount: '' });
      setTransferError('');
      alert('Transfer successful!');
    },
    onError: (error) => {
      setTransferError(error.response?.data?.message || 'Transfer failed');
    },
  });

  const handleTransfer = (e) => {
    e.preventDefault();
    if (!transferData.toAccount || !transferData.amount) return;
    transferMutation.mutate({
      toAccountId: transferData.toAccount,
      amount: parseFloat(transferData.amount),
    });
  };

  if (isLoading) {
    return <div className="animate-pulse flex space-x-4">Loading dashboard...</div>;
  }

  const currentBalance = stats?.balance !== undefined ? stats.balance : 0;
  const totalCredits = stats?.totalCredits !== undefined ? stats.totalCredits : 0;
  const totalDebits = stats?.totalDebits !== undefined ? stats.totalDebits : 0;
  const recentTransactions = stats?.recentTransactions || [];
  const accountId = stats?.accountId || 'N/A';

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-400 font-medium mb-1">Current Balance</p>
              <h3 className="text-3xl font-bold text-white">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs text-slate-500 mt-2 bg-black/30 px-2.5 py-1 rounded-md font-mono border border-white/5 inline-block select-all">Account ID: {accountId}</p>
            </div>
            <div className="p-3 bg-primary/20 rounded-xl">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-sm text-emerald-400 flex items-center gap-1 relative z-10">
            <ArrowUpRight className="w-4 h-4" />
            <span>+2.4% this month</span>
          </p>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 font-medium mb-1">Total Credits</p>
              <h3 className="text-2xl font-bold text-white">${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 font-medium mb-1">Total Debits</p>
              <h3 className="text-2xl font-bold text-white">${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-rose-500/20 rounded-xl">
              <ArrowDownRight className="w-5 h-5 text-rose-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            <button className="text-sm text-primary hover:text-primary/80 font-medium">View All</button>
          </div>
          <div className="p-0">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-white/5 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{tx.description}</td>
                    <td className="px-6 py-4">{tx.date}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Transfer Form */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Quick Transfer
          </h3>
          
          {transferError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
              {transferError}
            </div>
          )}

          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">To Account ID / Email</label>
              <input
                type="text"
                value={transferData.toAccount}
                onChange={(e) => setTransferData({...transferData, toAccount: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Account number or email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Amount ($)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-8 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={transferMutation.isPending}
              className="w-full py-2.5 px-4 mt-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {transferMutation.isPending ? 'Processing...' : (
                <>
                  Send Money <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
