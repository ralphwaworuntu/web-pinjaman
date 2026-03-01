import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Borrower, LoanTransaction } from '../types';
import { Users, Plus, Trash2, Search, FileSpreadsheet, Edit2, ArrowUpDown, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '../utils/loanCalculator';
import { generateId } from '../utils/idGenerator';
import ExcelImportModal from './ExcelImportModal';
import ConfirmationModal from './ConfirmationModal';
import EditBorrowerModal from './EditBorrowerModal';

// ... inside component ...


export default function BorrowerManager() {
    const { state, dispatch } = useApp();
    const { showToast } = useToast();
    const [newName, setNewName] = useState('');
    const [newLimit, setNewLimit] = useState('');
    const [search, setSearch] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [editBorrowerId, setEditBorrowerId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<'name-asc' | 'name-desc'>('name-asc');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
    } | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newLimit) return;

        dispatch({
            type: 'ADD_BORROWER',
            payload: {
                id: generateId(),
                name: newName,
                limit: Number(newLimit)
            }
        });

        showToast(`Peminjam "${newName}" berhasil ditambahkan`, 'success');
        setNewName('');
        setNewLimit('');
    };

    const toggleHide = (b: Borrower) => {
        dispatch({
            type: 'UPDATE_BORROWER',
            payload: {
                id: b.id,
                name: b.name,
                limit: b.limit,
                isHidden: !b.isHidden
            }
        });
        showToast(`Navigasi peminjam "${b.name}" ${!b.isHidden ? 'disembunyikan' : 'dimunculkan'}`, 'info');
    };

    const filteredBorrowers = state.borrowers.filter((b: Borrower) =>
        b.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a: Borrower, b: Borrower) => {
        if (sortConfig === 'name-asc') {
            return a.name.localeCompare(b.name);
        } else {
            return b.name.localeCompare(a.name);
        }
    });

    return (
        <div className="space-y-6">
            {/* Input Form */}
            <div className="card-glass p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Plus size={20} className="text-blue-400" />
                        Tambah Peminjam Baru
                    </h3>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                    >
                        <FileSpreadsheet size={14} />
                        Import Excel
                    </button>
                </div>

                <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm text-slate-400 mb-1">Nama Lengkap</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Contoh: Budi Santoso"
                            value={newName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-sm text-slate-400 mb-1">Limit Pinjaman</label>
                        <input
                            type="number"
                            className="input-field"
                            placeholder="Rp 2.000.000"
                            value={newLimit}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLimit(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn-primary w-full md:w-auto flex items-center gap-2 justify-center">
                        <Plus size={18} />
                        Tambah
                    </button>
                </form>
            </div>

            {/* List */}
            <div className="card-glass p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Users size={20} className="text-purple-400" />
                        Database Peminjam ({filteredBorrowers.length})
                    </h3>
                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        {/* Sort Filter */}
                        <div className="relative">
                            <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select
                                value={sortConfig}
                                onChange={(e) => setSortConfig(e.target.value as 'name-asc' | 'name-desc')}
                                className="input-field pl-9 py-1.5 text-sm appearance-none cursor-pointer"
                            >
                                <option value="name-asc">Nama (A-Z)</option>
                                <option value="name-desc">Nama (Z-A)</option>
                            </select>
                        </div>

                        {/* Search Box */}
                        <div className="relative flex-1 md:flex-none">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Cari nama..."
                                className="input-field pl-9 py-1.5 text-sm w-full"
                                value={search}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                <th className="py-3 px-4">Nama</th>
                                <th className="py-3 px-4">Limit</th>
                                <th className="py-3 px-4">Status Hutang</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredBorrowers.map((borrower: Borrower) => {
                                // Calculate current debt
                                const currentDebt = state.transactions
                                    .filter((t: LoanTransaction) => t.borrowerId === borrower.id && t.status !== 'Lunas')
                                    .reduce((sum: number, t: LoanTransaction) => sum + (t.totalDue - t.paidAmount), 0);

                                return (
                                    <tr key={borrower.id} className={`hover:bg-slate-800/50 transition-colors ${borrower.isHidden ? 'opacity-60' : ''}`}>
                                        <td className="py-3 px-4">
                                            <div className="font-medium flex items-center gap-2">
                                                {borrower.name}
                                                {borrower.isHidden && (
                                                    <span className="text-[10px] bg-slate-700 text-slate-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        Disembunyikan
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">{formatCurrency(borrower.limit)}</td>
                                        <td className="py-3 px-4">
                                            {currentDebt > 0 ? (
                                                <span className="text-rose-400 bg-rose-500/10 px-2 py-1 rounded text-xs border border-rose-500/20">
                                                    Hutang: {formatCurrency(currentDebt)}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs border border-emerald-500/20">
                                                    Bersih
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => toggleHide(borrower)}
                                                    className={`p-2 rounded-lg transition-colors ${borrower.isHidden ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-700'}`}
                                                    title={borrower.isHidden ? "Munculkan Kembali" : "Sembunyikan dari Input Transaksi"}
                                                >
                                                    {borrower.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => setEditBorrowerId(borrower.id)}
                                                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                    title="Edit Data"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Hapus Peminjam?',
                                                            message: `Hapus peminjam "${borrower.name}"? Data yang dihapus tidak dapat dikembalikan.`,
                                                            type: 'danger',
                                                            onConfirm: () => {
                                                                dispatch({ type: 'DELETE_BORROWER', payload: borrower.id });
                                                                showToast(`Peminjam "${borrower.name}" dihapus`, 'warning');
                                                            }
                                                        });
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    title="Hapus Data"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredBorrowers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users size={48} className="text-slate-700" />
                                            <p className="text-slate-500 font-bold text-lg">Belum ada data peminjam</p>
                                            <p className="text-slate-600 text-sm">
                                                Tambahkan peminjam baru untuk memulai pencatatan.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showImportModal && (
                <ExcelImportModal onClose={() => setShowImportModal(false)} />
            )}

            {editBorrowerId && (
                <EditBorrowerModal
                    borrowerId={editBorrowerId}
                    onClose={() => setEditBorrowerId(null)}
                />
            )}

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
