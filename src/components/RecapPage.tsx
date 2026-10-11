import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { LoanTransaction } from '../types';
import { formatCurrency } from '../utils/loanCalculator';
import { FileText, TrendingUp, Wallet, Users, ArrowUpDown } from 'lucide-react';
import MonthYearSelect from './MonthYearSelect';
import { ALL_PERIOD, matchesPeriod } from '../utils/month';



export default function RecapPage() {
    const { state } = useApp();
    const [selectedMonth, setSelectedMonth] = useState<string>(ALL_PERIOD);
    const [sortConfig, setSortConfig] = useState<'name-asc' | 'name-desc' | 'profit-desc' | 'profit-asc'>('name-asc');

    // Filter transactions based on selected month
    const filteredTransactions = useMemo(() => {
        if (selectedMonth === ALL_PERIOD) return state.transactions;
        return state.transactions.filter((t: LoanTransaction) => matchesPeriod(t.dueMonth, selectedMonth));
        return state.transactions.filter((t: LoanTransaction) => {
            // Check if transaction belongs to active month of its category
            // const activeMonth = t.category === 'Gaji' ? state.config.activeMonthGaji : state.config.activeMonthRemon;
            // Since we don't strictly link transaction date to "Active Month" string in the object, 
            // we might need a better way. 
            // BUT, usually "Active Month" in config implies the CURRENT view.
            // PROPOSAL: We should probably rely on created date or a specific field?
            // For now, let's assume all *Active* (Unpaid) are relevant, OR allow user to select month?
            // User requirement: "MODAL KELUAR BULANAN/ACTIVE MONTH"
            // Let's filter by transactions that are NOT 'Lunas', because Lunas might be old?
            // NO, "Proft Bulanan" implies historical data too.
            // Let's assume "Active Month" matches the one in Config.
            // But transactions don't store "Month period" explicitly, only date.
            // For V2, we might want to just show ALL transactions for now, or match specific string if we added it?
            // We didn't add "Period" to LoanTransaction. We assume 'date' or 'createdAt'.
            // Simple approach: Filter by *Status* for "Active" vs "History"? 
            // User said "ACTIVE MONTH" and "ALL MONTH". 
            // Let's assume "Active Month" means *Current Cycle* (maybe untagged loans are current?).
            // Actually, best approximation for "Active Month" without a Period field is "Unpaid or Recently Paid".
            // Let's stick to "All Time" vs "Active/Open" for now, or just show all and let user filter?
            // Let's implement Client-side filtering if possible.
            // Current approach: "Monthly" = created this month? 
            // Better: "Monthly" = transactions where status is NOT Lunas (Active Cycle) OR Lunas recently?
            // Let's just use ALL for now and label it 'All Time' as default, and 'Active Cycle' (= Unpaid).

            // Re-reading user request: "MODAL KELUAR BULANAN/ACTIVE MONTH"
            // "ACTIVE MONTH" likely refers to the "Month" configured in settings.
            // Since we don't store "Month Name" in transaction, we can't filter precisely by "Maret 2026".
            // We only have `date` (ISO string).
            // Let's try to match the *Month String* from Config? 
            // Config: "Maret 2026". 
            // If I map ISO date to "Month Year" string, I can compare.

            if (t.category === 'Gaji') return true; // Temporary: showing all for Gaji
            return true;
        });
    }, [state.transactions, selectedMonth]);

    // Calculate Summaries
    const summary = useMemo(() => {
        let totalModal = 0;
        let totalProfit = 0;
        let totalOutstanding = 0;

        filteredTransactions.forEach(t => {
            totalModal += t.totalPrincipal;
            totalProfit += (t.totalDue - t.totalPrincipal); // Potential Profit
            if (t.status !== 'Lunas') {
                totalOutstanding += (t.totalDue - t.paidAmount);
            }
        });

        // Realized Profit (based on paid amount logic? Usually Profit is recognized pro-rata or upon payment)
        // Simple View: Potential Profit.

        return { totalModal, totalProfit, totalOutstanding };
    }, [filteredTransactions]);

    // Per-Borrower Aggregation
    const borrowerStats = useMemo(() => {
        const stats: Record<string, {
            name: string;
            gajiCount: number;
            remonCount: number;
            totalLoan: number;
            totalProfit: number;
            activeLoans: number;
        }> = {};

        state.transactions.forEach((t: LoanTransaction) => {
            if (!stats[t.borrowerId]) {
                stats[t.borrowerId] = {
                    name: t.borrowerName,
                    gajiCount: 0,
                    remonCount: 0,
                    totalLoan: 0,
                    totalProfit: 0,
                    activeLoans: 0
                };
            }

            const s = stats[t.borrowerId];
            if (t.category === 'Gaji') s.gajiCount++;
            else s.remonCount++;

            s.totalLoan += t.totalPrincipal;
            s.totalProfit += (t.totalDue - t.totalPrincipal);
            if (t.status !== 'Lunas') s.activeLoans++;
        });

        return Object.values(stats).sort((a, b) => {
            if (sortConfig === 'name-asc') {
                return a.name.localeCompare(b.name);
            } else if (sortConfig === 'name-desc') {
                return b.name.localeCompare(a.name);
            } else if (sortConfig === 'profit-desc') {
                return b.totalProfit - a.totalProfit;
            } else if (sortConfig === 'profit-asc') {
                return a.totalProfit - b.totalProfit;
            }
            return 0;
        });
    }, [state.transactions, sortConfig]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Rekapan Keuangan</h2>
                        <p className="text-sm text-slate-400">Analisis performa pinjaman dan profitabilitas.</p>
                    </div>
                </div>

                <MonthYearSelect
                    months={state.config.availableMonths || []}
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    allowAll
                    className="w-full md:w-96"
                    selectClassName="w-full appearance-none bg-slate-800 border border-slate-700 text-white text-sm font-bold py-2.5 pl-3 pr-8 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed [&>option]:bg-slate-900"
                />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-glass p-6 text-blue-400 border-blue-500/20 bg-blue-500/5">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-medium text-slate-400">Total Modal Keluar</h3>
                        <Wallet size={24} />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{formatCurrency(summary.totalModal)}</p>
                    <p className="text-xs text-blue-400/60">Dana yang dipinjamkan {selectedMonth === ALL_PERIOD ? '(Total)' : `(${selectedMonth})`}</p>
                </div>

                <div className="card-glass p-6 text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-medium text-slate-400">Total Profit (Bunga)</h3>
                        <TrendingUp size={24} />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{formatCurrency(summary.totalProfit)}</p>
                    <p className="text-xs text-emerald-400/60">Akumulasi pendapatan bunga</p>
                </div>

                <div className="card-glass p-6 text-amber-400 border-amber-500/20 bg-amber-500/5">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-medium text-slate-400">Hutang Aktif</h3>
                        <Users size={24} />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{formatCurrency(summary.totalOutstanding)}</p>
                    <p className="text-xs text-amber-400/60">Sisa tagihan yang belum dibayar</p>
                </div>
            </div>

            {/* Borrower Stats Table */}
            <div className="card-glass overflow-hidden">
                <div className="p-6 border-b border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold">Statistik Peminjam</h3>
                        <p className="text-sm text-slate-400">Rincian aktivitas per nasabah</p>
                    </div>
                    {/* Sort Dropdown */}
                    <div className="relative w-full md:w-auto">
                        <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <select
                            value={sortConfig}
                            onChange={(e) => setSortConfig(e.target.value as any)}
                            className="bg-slate-800 text-slate-200 text-sm font-semibold pl-9 pr-8 py-2 w-full rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer appearance-none hover:bg-slate-700 transition-colors"
                        >
                            <option value="name-asc">Nama (A-Z)</option>
                            <option value="name-desc">Nama (Z-A)</option>
                            <option value="profit-desc">Profit (Tinggi ke Rendah)</option>
                            <option value="profit-asc">Profit (Rendah ke Tinggi)</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Nama Nasabah</th>
                                <th className="px-6 py-4 text-center">Pinjaman Aktif</th>
                                <th className="px-6 py-4 text-center">Total Frekuensi</th>
                                <th className="px-6 py-4 text-right">Total Pinjaman</th>
                                <th className="px-6 py-4 text-right">Total Profit Disumbang</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {borrowerStats.map((stat, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-200">{stat.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        {stat.activeLoans > 0 ? (
                                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20">
                                                {stat.activeLoans} Aktif
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-slate-400">
                                        {stat.gajiCount + stat.remonCount}x <span className="text-xs text-slate-600">({stat.gajiCount} Gaji, {stat.remonCount} Remon)</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-300">{formatCurrency(stat.totalLoan)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-400">{formatCurrency(stat.totalProfit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
