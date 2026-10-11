import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/loanCalculator';
import { Search, CheckCircle, Circle, ArrowUpDown } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import MonthYearSelect from './MonthYearSelect';
import { ACTIVE_PERIOD, matchesPeriod } from '../utils/month';
export default function MarkAsPaidPage() {
    const { state, dispatch } = useApp();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>(ACTIVE_PERIOD);
    const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Gaji' | 'Remon'>('Semua');
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'date'; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        txId: string;
        isLunas: boolean;
        totalDue: number;
        borrowerName: string;
    } | null>(null);

    const { activeMonthGaji, activeMonthRemon } = state.config;

    const filteredTransactions = useMemo(() => {
        return state.transactions.filter(t => {
            if (t.isArrear) return false; // Focus on active loans

            // Filters
            if (selectedMonth === ACTIVE_PERIOD) {
                const activeMonth = t.category === 'Gaji' ? activeMonthGaji : activeMonthRemon;
                if (t.dueMonth !== activeMonth) return false;
            } else if (!matchesPeriod(t.dueMonth, selectedMonth)) return false;
            if (selectedCategory !== 'Semua' && t.category !== selectedCategory) return false;
            if (search && !t.borrowerName.toLowerCase().includes(search.toLowerCase())) return false;

            return true;
        }).sort((a, b) => {
            // First by status (Belum Lunas/Cicil first, Lunas later)
            if (a.status !== b.status) {
                if (a.status === 'Lunas') return 1;
                if (b.status === 'Lunas') return -1;
            }

            // Then by selected sorting
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc'
                    ? a.borrowerName.localeCompare(b.borrowerName)
                    : b.borrowerName.localeCompare(a.borrowerName);
            } else {
                // sort by date
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
        });
    }, [state.transactions, selectedMonth, selectedCategory, search, sortConfig, activeMonthGaji, activeMonthRemon]);

    const handleTogglePaidClick = (txId: string, isLunas: boolean, totalDue: number, borrowerName: string) => {
        setConfirmModal({
            isOpen: true,
            txId,
            isLunas,
            totalDue,
            borrowerName
        });
    };

    const confirmTogglePaid = () => {
        if (!confirmModal) return;
        const { txId, isLunas, totalDue } = confirmModal;

        if (isLunas) {
            // Uncheck -> set paidAmount to 0
            dispatch({
                type: 'UPDATE_TRANSACTION',
                payload: {
                    id: txId,
                    totalPrincipal: state.transactions.find(t => t.id === txId)?.totalPrincipal || 0,
                    totalDue: totalDue,
                    paidAmount: 0
                }
            });
            showToast('Status Lunas dibatalkan', 'info');
        } else {
            // Check -> set paidAmount to totalDue
            dispatch({
                type: 'UPDATE_TRANSACTION',
                payload: {
                    id: txId,
                    totalPrincipal: state.transactions.find(t => t.id === txId)?.totalPrincipal || 0,
                    totalDue: totalDue,
                    paidAmount: totalDue
                }
            });
            showToast('Ditandai sebagai Lunas', 'success');
        }
        setConfirmModal(null);
    };

    return (
        <div className="space-y-6">
            <div className="card-glass p-6 border-b border-slate-700/50 space-y-6 flex flex-col">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            Tandai Lunas Cepat
                            <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                                {filteredTransactions.length} Data
                            </span>
                            {selectedMonth === ACTIVE_PERIOD && (
                                <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Periode aktif
                                </span>
                            )}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">Centang untuk melunasi seluruh tagihan sekaligus.</p>
                    </div>
                </div>

                <div className="flex flex-col-reverse xl:flex-row gap-6">
                    {/* Search Bar - This will be at the bottom on mobile due to flex-col-reverse */}
                    <div className="flex items-center gap-4 w-full xl:w-min overflow-hidden">
                        <div className="relative flex-1 xl:w-64">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Cari nasabah..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field pl-9 py-2 text-base font-medium w-full"
                            />
                        </div>
                    </div>

                    {/* Filters - This will be at the top on mobile due to flex-col-reverse */}
                    <div className="bg-slate-950/30 p-4 rounded-xl border border-white/5 space-y-4 xl:space-y-0 flex-1 flex flex-col xl:flex-row xl:items-center xl:gap-6">
                        {/* Category Filter */}
                        <div className="flex items-center gap-4 w-full xl:w-auto">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden xl:block">Filter:</span>
                            <div className="flex-1 grid grid-cols-3 gap-1 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                                {(['Semua', 'Gaji', 'Remon'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`flex items-center justify-center px-2 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${selectedCategory === cat
                                            ? cat === 'Gaji' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : cat === 'Remon' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                                    : 'bg-slate-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-px h-8 bg-slate-700 hidden xl:block" />

                        {/* Sort Filter */}
                        <div className="relative w-full xl:w-48">
                            <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select
                                value={`${sortConfig.key}-${sortConfig.direction}`}
                                onChange={(e) => {
                                    const [key, direction] = e.target.value.split('-');
                                    setSortConfig({ key: key as 'name' | 'date', direction: direction as 'asc' | 'desc' });
                                }}
                                className="input-field pl-9 py-2 text-base font-medium w-full appearance-none cursor-pointer"
                            >
                                <option value="name-asc">Nama (A-Z)</option>
                                <option value="name-desc">Nama (Z-A)</option>
                                <option value="date-desc">Pinjaman Baru</option>
                                <option value="date-asc">Pinjaman Lama</option>
                            </select>
                        </div>

                        <div className="w-px h-8 bg-slate-700 hidden xl:block" />

                        {/* Month Filter */}
                        <div className="w-full xl:w-80">
                            <MonthYearSelect
                                months={state.config.availableMonths || []}
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                allowAll
                                allowActive
                                activeLabel={activeMonthGaji === activeMonthRemon
                                    ? `Periode Aktif (${activeMonthGaji})`
                                    : `Periode Aktif (Gaji: ${activeMonthGaji}, Remon: ${activeMonthRemon})`}
                                selectClassName="input-field py-2 text-base font-medium w-full appearance-none cursor-pointer pl-3 pr-8 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTransactions.map(tx => {
                    const isLunas = tx.paidAmount >= tx.totalDue && tx.totalDue > 0;

                    return (
                        <div
                            key={tx.id}
                            className={`card-glass p-0 overflow-hidden group transition-all duration-300 ${isLunas ? 'opacity-70 border-emerald-500/30 bg-emerald-500/5' : 'hover:-translate-y-1 hover:shadow-xl hover:border-slate-600/50'}`}
                            onClick={() => handleTogglePaidClick(tx.id, isLunas, tx.totalDue, tx.borrowerName)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="p-4 sm:p-5 flex flex-col h-full gap-4">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold text-white shrink-0 shadow-lg ${tx.category === 'Gaji' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-purple-600 shadow-purple-500/20'}`}>
                                            {tx.borrowerName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-200 text-base sm:text-lg truncate mb-1" title={tx.borrowerName}>
                                                {tx.borrowerName}
                                            </h4>
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`font-bold text-base sm:text-lg ${isLunas ? 'text-emerald-400 line-through opacity-70' : 'text-rose-400'}`}>
                                                    {isLunas ? formatCurrency(tx.totalDue) : formatCurrency(tx.totalDue - tx.paidAmount)}
                                                </span>
                                                <p className="text-slate-400 text-xs sm:text-sm">
                                                    {tx.paidAmount > 0 && !isLunas ? (
                                                        <span className="text-amber-400">Dicicil: {formatCurrency(tx.paidAmount)} • </span>
                                                    ) : null}
                                                    Cair: {formatCurrency(tx.totalPrincipal)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 items-center mt-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${tx.category === 'Gaji'
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                    }`}>
                                                    {tx.category} {tx.dueMonth}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className={`shrink-0 transition-colors p-1 rounded-full ${isLunas ? 'text-emerald-500' : 'text-slate-600 group-hover:text-blue-400'}`}
                                    >
                                        {isLunas ? (
                                            <CheckCircle size={28} className="fill-emerald-500/20 w-6 h-6 sm:w-7 sm:h-7" />
                                        ) : (
                                            <Circle size={28} className="w-6 h-6 sm:w-7 sm:h-7" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredTransactions.length === 0 && (
                    <div className="col-span-full card-glass p-12 flex flex-col items-center justify-center text-center">
                        <CheckCircle size={48} className="text-slate-700 mb-4" />
                        <h4 className="text-xl font-bold text-slate-400">Tidak ada tagihan</h4>
                        <p className="text-slate-500 mt-2">Ubah filter untuk melihat data lain.</p>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal(null)}
                    onConfirm={confirmTogglePaid}
                    title={confirmModal.isLunas ? 'Batalkan Status Lunas?' : 'Tandai Sebagai Lunas?'}
                    message={confirmModal.isLunas
                        ? `Apakah Anda yakin ingin mengembalikan status pinjaman ${confirmModal.borrowerName} menjadi belum lunas?`
                        : `Tagihan atas nama ${confirmModal.borrowerName} sebesar ${formatCurrency(confirmModal.totalDue)} akan ditandai LUNAS. Lanjutkan?`}
                    type={confirmModal.isLunas ? 'warning' : 'info'}
                    confirmText={confirmModal.isLunas ? 'Ya, Batalkan' : 'Ya, Lunas'}
                />
            )}
        </div>
    );
}
