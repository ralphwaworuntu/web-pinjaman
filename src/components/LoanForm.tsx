import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Borrower, LoanTransaction, LoanCategory } from '../types';
import { formatCurrency } from '../utils/loanCalculator';
import { Calculator, AlertTriangle, CheckCircle2, Wallet, Calendar } from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import ConfirmationModal from './ConfirmationModal';

const QUICK_AMOUNTS = [
    100000, 200000, 300000, 500000,
    1000000, 1500000, 2000000, 2500000
];

export default function LoanForm() {
    const { state, dispatch } = useApp();
    const { showToast } = useToast();

    // Form State
    const [selectedBorrowerId, setSelectedBorrowerId] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<LoanCategory>(state.config.activeCycle); // Default to active cycle
    const [isPriority, setIsPriority] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
    } | null>(null);

    // Effect: Update category if global active cycle changes (optional, but good UX)
    useEffect(() => {
        setCategory(state.config.activeCycle);
    }, [state.config.activeCycle]);

    // Derived Values based on Category
    const activeMonth = category === 'Gaji' ? state.config.activeMonthGaji : state.config.activeMonthRemon;
    const interestRate = category === 'Gaji' ? state.config.interestRateGaji : state.config.interestRateRemon;

    // Derived state for Limit Guard
    const limitGuard = useMemo(() => {
        if (!selectedBorrowerId || !amount) return null;

        const borrower = state.borrowers.find((b: Borrower) => b.id === selectedBorrowerId);
        if (!borrower) return null;

        // Hitung hutang berjalan (Global: Gaji + Remon) -> BERDASARKAN TOTAL POKOK (PRINCIPAL)
        const activeTransactions = state.transactions.filter((t: LoanTransaction) => t.borrowerId === selectedBorrowerId && t.status !== 'Lunas');

        const currentPrincipalDebt = activeTransactions.reduce((sum: number, t: LoanTransaction) => sum + t.totalPrincipal, 0);

        // Hitung total tagihan aktif KHUSUS untuk bulan dan kategori yang dipilih
        const currentTotalDueOnMonth = activeTransactions
            .filter((t: LoanTransaction) => t.category === category && t.dueMonth === activeMonth)
            .reduce((sum: number, t: LoanTransaction) => sum + (t.totalDue - t.paidAmount), 0);

        const newPrincipal = Number(amount);
        const projectedTotalPrincipal = currentPrincipalDebt + newPrincipal;
        const isOverLimit = projectedTotalPrincipal > borrower.limit;

        // Simulasi tagihan baru (Pokok + Bunga)
        const newLoanDueAmount = newPrincipal + (newPrincipal * (interestRate / 100));

        // Total akumulasi tagihan di bulan ini
        const totalPaymentDue = currentTotalDueOnMonth + newLoanDueAmount;

        return {
            borrower,
            currentDebt: currentPrincipalDebt, // Label as "Total Pokok Berjalan"
            newLoanTotalDue: newPrincipal, // Label as "Pinjaman Baru (Pokok)"
            projectedTotalDebt: projectedTotalPrincipal,
            isOverLimit,
            remainingLimit: borrower.limit - currentPrincipalDebt,

            // New fields for payment simulation
            currentTotalDueOnMonth,
            newLoanDueAmount,
            totalPaymentDue
        };
    }, [selectedBorrowerId, amount, state.transactions, state.borrowers, interestRate, category, activeMonth]);

    // Sort borrowers alphabetically A-Z and hide those with isHidden = true
    const sortedBorrowers = useMemo(() => {
        return [...state.borrowers]
            .filter((b: Borrower) => !b.isHidden)
            .sort((a: Borrower, b: Borrower) => a.name.localeCompare(b.name));
    }, [state.borrowers]);

    const executeLoanTransaction = () => {
        dispatch({
            type: 'ADD_LOAN',
            payload: {
                borrowerId: selectedBorrowerId,
                amount: Number(amount),
                rate: interestRate,
                category: category,
                isPriority: isPriority
            }
        });

        const borrowerName = state.borrowers.find((b: Borrower) => b.id === selectedBorrowerId)?.name ?? 'Peminjam';
        showToast(`Transaksi ${category} ${formatCurrency(Number(amount))} untuk ${borrowerName} berhasil dicatat`, 'success');
        setAmount('');
        setSelectedBorrowerId('');
        setIsPriority(false);
        setConfirmModal(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBorrowerId || !amount) return;

        if (limitGuard?.isOverLimit) {
            setConfirmModal({
                isOpen: true,
                title: 'Peringatan Over Limit!',
                message: `Peminjaman ini melebihi limit!\n\nLimit: ${formatCurrency(limitGuard.borrower.limit)}\nTotal Hutang (Projected): ${formatCurrency(limitGuard.projectedTotalDebt)}\n\nLanjutkan peminjaman?`,
                type: 'warning',
                onConfirm: executeLoanTransaction
            });
            return;
        }

        executeLoanTransaction();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Category Tabs */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                <button
                    onClick={() => setCategory('Gaji')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${category === 'Gaji'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                >
                    <Wallet size={18} />
                    Pinjaman GAJI <span className="text-sm font-normal opacity-90 uppercase">({state.config.activeMonthGaji})</span>
                </button>
                <button
                    onClick={() => setCategory('Remon')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${category === 'Remon'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                >
                    <Calendar size={18} />
                    Pinjaman REMON <span className="text-sm font-normal opacity-90 uppercase">({state.config.activeMonthRemon})</span>
                </button>
            </div>

            <div className="card-glass p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg ${category === 'Gaji' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Input Transaksi {category}</h3>
                        <p className="text-slate-400 text-sm">
                            Bunga: <span className={`${category === 'Gaji' ? 'text-blue-400' : 'text-purple-400'} font-bold`}>{interestRate}%</span> •
                            Jatuh Tempo: <span className="text-slate-200 font-bold">{activeMonth}</span>
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Pilih Peminjam</label>
                        <select
                            value={selectedBorrowerId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedBorrowerId(e.target.value)}
                            className="input-field appearance-none"
                            required
                        >
                            <option value="">-- Pilih Nama --</option>
                            {sortedBorrowers.map((b: Borrower) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                        <input
                            type="checkbox"
                            id="isPriority"
                            checked={isPriority}
                            onChange={(e) => setIsPriority(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <label htmlFor="isPriority" className="text-sm font-medium text-slate-300 cursor-pointer select-none flex items-center gap-2">
                            Nasabah Prioritas <span className="text-amber-400 text-xs">(Bintang)</span>
                        </label>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300">Nominal Pinjaman (Principal)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                            <CurrencyInput
                                value={amount}
                                onChange={(val) => setAmount(val)}
                                className="input-field pl-10"
                                placeholder="0"
                                required
                            />
                        </div>

                        {/* Quick Amounts */}
                        <div className="flex flex-wrap gap-2">
                            {QUICK_AMOUNTS.map((val) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setAmount(val.toString())}
                                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 text-xs text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 transition-all"
                                >
                                    {formatCurrency(val)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Limit Guard & Calculation Preview */}
                    {limitGuard && (
                        <div className={`p-4 rounded-xl border ${limitGuard.isOverLimit ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
                            <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700/50 pb-2">Simulasi Perhitungan {category}</h4>

                            <div className="space-y-4">
                                {/* Limit Calculation Section */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Pokok Berjalan:</span>
                                        <span className="font-medium text-slate-200">{formatCurrency(limitGuard.currentDebt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Pinjaman Baru (Pokok):</span>
                                        <span className={`font-medium ${category === 'Gaji' ? 'text-blue-400' : 'text-purple-400'}`}>+ {formatCurrency(limitGuard.newLoanTotalDue)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-700/50">
                                        <span className="text-slate-200 font-bold">Total Akumulasi Pokok:</span>
                                        <span className={`font-bold ${limitGuard.isOverLimit ? 'text-rose-400' : 'text-slate-200'}`}>
                                            {formatCurrency(limitGuard.projectedTotalDebt)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-xs mt-1">
                                        <span className="text-slate-500">Limit Kredit:</span>
                                        <span className="text-slate-400">{formatCurrency(limitGuard.borrower.limit)}</span>
                                    </div>

                                    {limitGuard.isOverLimit && (
                                        <div className="flex items-start gap-2 mt-3 text-rose-400 bg-rose-950/30 p-2 rounded-lg">
                                            <AlertTriangle size={16} className="mt-0.5" />
                                            <p className="text-xs leading-relaxed">
                                                <strong>Over Limit Warning:</strong> Total pokok pinjaman melebihi limit yang ditentukan. Persetujuan manual diperlukan.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Payment Simulation Section */}
                                <div className="space-y-2 text-sm pt-4 border-t border-slate-700/50">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Tagihan Aktif pada {category} {activeMonth}:</span>
                                        <span className="font-medium text-slate-200">{formatCurrency(limitGuard.currentTotalDueOnMonth)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Tagihan Pinjaman Baru (Pokok+Bunga):</span>
                                        <span className={`font-medium ${category === 'Gaji' ? 'text-blue-400' : 'text-purple-400'}`}>+ {formatCurrency(limitGuard.newLoanDueAmount)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-700/50">
                                        <span className="text-amber-400 font-bold uppercase text-xs sm:text-sm tracking-wider">Total Harus Dibayar ({activeMonth}):</span>
                                        <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                            {formatCurrency(limitGuard.totalPaymentDue)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${limitGuard?.isOverLimit
                            ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                            : category === 'Gaji'
                                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
                            } text-white shadow-lg active:scale-95`}
                    >
                        {limitGuard?.isOverLimit ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                        Proses Transaksi {category}
                    </button>
                </form>
            </div>

            {confirmModal && (
                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal(null)}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                />
            )}
        </div>
    );
}
