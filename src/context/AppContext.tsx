import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Borrower, LoanTransaction, AppConfig, LoanEntry } from '../types';
import { calculateTotalDue } from '../utils/loanCalculator';
import { generateId } from '../utils/idGenerator';
import { useToast } from './ToastContext';

// State Definition
interface AppState {
    borrowers: Borrower[];
    transactions: LoanTransaction[];
    config: AppConfig;
    /**
     * Daftar ID aksi terakhir yang sudah diterapkan ke data ini. Dipakai agar aksi yang sama
     * tidak diterapkan dua kali (mis. respons server hilang lalu dikirim ulang, atau dua tab
     * di browser yang sama mengirim antrean yang sama).
     */
    appliedSeeds?: string[];
}

// Initial State
const initialState: AppState = {
    borrowers: [],
    transactions: [],
    config: {
        activeCycle: 'Gaji',
        activeMonthGaji: 'Maret 2026',
        interestRateGaji: 20,
        activeMonthRemon: 'Maret 2026',
        interestRateRemon: 10,
        version: 4,
        availableMonths: ['Maret 2026', 'April 2026', 'Mei 2026']
    }
};

// State Migration Logic
const migrateState = (savedState: any): AppState => {
    // Basic migration: ensure config has all new fields
    const newState = { ...initialState, ...savedState };

    // Example: Ensure version is set
    if (!newState.config.version) {
        newState.config.version = 3;
    }

    // Ensure separate configs exist if coming from V1
    if (!newState.config.activeMonthGaji && newState.config.activeMonth) {
        newState.config.activeMonthGaji = newState.config.activeMonth;
        newState.config.activeMonthRemon = newState.config.activeMonth;
    }
    if (!newState.config.interestRateGaji && newState.config.interestRate) {
        newState.config.interestRateGaji = newState.config.interestRate;
        newState.config.interestRateRemon = 10; // Default
    }

    // Migration: Add dueMonth to transactions if missing
    if (newState.transactions) {
        newState.transactions = newState.transactions.map((t: any) => ({
            ...t,
            dueMonth: t.dueMonth || (t.category === 'Gaji' ? newState.config.activeMonthGaji : newState.config.activeMonthRemon) // Fallback to current config
        }));
    }

    // Migration V4: Month Management
    // ALWAYS ensure availableMonths covers all transactions (logic changed to always check)
    const distinctMonths = new Set<string>(newState.config.availableMonths || []);
    if (newState.config.activeMonthGaji) distinctMonths.add(newState.config.activeMonthGaji);
    if (newState.config.activeMonthRemon) distinctMonths.add(newState.config.activeMonthRemon);

    if (newState.transactions) {
        newState.transactions.forEach((t: any) => {
            if (t.dueMonth) distinctMonths.add(t.dueMonth);
        });
    }

    // Standard defaults if empty
    if (distinctMonths.size === 0) {
        distinctMonths.add('Maret 2026');
        distinctMonths.add('April 2026');
    }

    // Sort months strictly by implementation of "Month Year" parsing or just leave as strings if format is standard
    // Let's do a simple sort or keeping user order? 
    // Ideally we want to prevent "April 2025" coming after "Januari 2026" if we strictly sort via string.
    // Re-sorting every time might be annoying if user has custom order, but they don't have custom order UI yet.
    // Let's sorting by Time.
    const monthMap: { [key: string]: number } = {
        'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
        'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
    };

    const sortedMonths = Array.from(distinctMonths).sort((a, b) => {
        const [mA, yA] = a.split(' ');
        const [mB, yB] = b.split(' ');
        const yearDiff = (parseInt(yA) || 0) - (parseInt(yB) || 0);
        if (yearDiff !== 0) return yearDiff;
        return (monthMap[mA] ?? 0) - (monthMap[mB] ?? 0);
    });

    newState.config.availableMonths = sortedMonths;

    return newState;
};

// Stempel yang ditambahkan otomatis ke setiap aksi saat di-dispatch.
// Dengan stempel ini aksi bisa diputar ulang (replay) dan menghasilkan ID & waktu yang SAMA,
// sehingga antrean perubahan offline tetap konsisten (mis. tambah pinjaman lalu bayar cicilan).
interface ActionStamp {
    _seed?: string;
    _ts?: string;
}

// Actions
export type Action = ActionStamp & (
    | { type: 'ADD_BORROWER'; payload: Borrower }
    | { type: 'DELETE_BORROWER'; payload: string }
    | { type: 'ADD_LOAN'; payload: { borrowerId: string; amount: number; rate: number; category: 'Gaji' | 'Remon'; isPriority?: boolean } }
    | { type: 'MAKE_PAYMENT'; payload: { transactionId: string; amount: number; date: string; note?: string } }
    | { type: 'DELETE_TRANSACTION'; payload: string }
    | { type: 'DELETE_TRANSACTIONS_BATCH'; payload: string[] }
    | { type: 'UPDATE_TRANSACTION'; payload: { id: string; totalPrincipal: number; totalDue: number; interestRate?: number; isPriority?: boolean; paidAmount?: number } }
    | { type: 'UPDATE_CONFIG'; payload: Partial<AppConfig> }
    | { type: 'LOAD_STATE'; payload: AppState }
    | { type: 'UPDATE_BORROWER'; payload: { id: string; name: string; limit: number; isHidden?: boolean } }
    | { type: 'MOVE_LOAN_CATEGORY'; payload: { id: string; newCategory: 'Gaji' | 'Remon' } }
    | { type: 'ADD_ARREAR_MANUAL'; payload: LoanTransaction }
    | { type: 'UPDATE_ARREAR'; payload: { id: string; totalPrincipal: number; totalDue: number; createdAt: string; dueMonth: string; isPriority?: boolean; paidAmount?: number } }
    | { type: 'DELETE_PAYMENT'; payload: { transactionId: string; installmentId: string } }
);

// Reducer
function appReducer(state: AppState, action: Action): AppState {
    // ID & waktu deterministik jika aksi sudah distempel (replay), jika tidak pakai nilai baru.
    let idCounter = 0;
    const newId = (): string => (action._seed ? `${action._seed}-${idCounter++}` : generateId());
    const nowIso = (): string => action._ts || new Date().toISOString();

    switch (action.type) {
        // ... (other cases remain same)
        case 'ADD_BORROWER':
            return { ...state, borrowers: [...state.borrowers, action.payload] };

        case 'DELETE_BORROWER':
            return { ...state, borrowers: state.borrowers.filter(b => b.id !== action.payload) };

        case 'UPDATE_BORROWER': {
            const { id, name, limit, isHidden } = action.payload;
            return {
                ...state,
                borrowers: state.borrowers.map(b => b.id === id ? { ...b, name, limit, isHidden: isHidden !== undefined ? isHidden : b.isHidden } : b),
                // Also update names in transactions for consistency
                transactions: state.transactions.map(t => t.borrowerId === id ? { ...t, borrowerName: name } : t)
            };
        }

        case 'MOVE_LOAN_CATEGORY': {
            const { id, newCategory } = action.payload;
            return {
                ...state,
                transactions: state.transactions.map(t => {
                    if (t.id !== id) return t;
                    return {
                        ...t,
                        category: newCategory,
                        dueMonth: newCategory === 'Gaji' ? state.config.activeMonthGaji : state.config.activeMonthRemon,
                        updatedAt: nowIso()
                    };
                })
            };
        }

        case 'ADD_LOAN': {
            const { borrowerId, amount, rate, category, isPriority } = action.payload;
            const borrower = state.borrowers.find(b => b.id === borrowerId);
            if (!borrower) return state;

            const existingTxIndex = state.transactions.findIndex(
                t => t.borrowerId === borrowerId && t.status !== 'Lunas' && t.category === category
            );

            const newEntry: LoanEntry = {
                id: newId(),
                borrowerId,
                category,
                amount,
                interestRate: rate,
                totalDue: calculateTotalDue(amount, rate),
                date: nowIso()
            };

            const activeMonth = category === 'Gaji' ? state.config.activeMonthGaji : state.config.activeMonthRemon;

            if (existingTxIndex >= 0) {
                const existingTx = state.transactions[existingTxIndex];
                const newTotalPrincipal = existingTx.totalPrincipal + amount;
                const newTotalDue = existingTx.totalDue + newEntry.totalDue;

                const updatedTx: LoanTransaction = {
                    ...existingTx,
                    entries: [...existingTx.entries, newEntry],
                    totalPrincipal: newTotalPrincipal,
                    totalDue: newTotalDue,
                    updatedAt: nowIso(),
                    status: existingTx.paidAmount > 0 ? 'Cicil' : 'Belum Lunas',
                    dueMonth: activeMonth,
                    isPriority: isPriority !== undefined ? isPriority : existingTx.isPriority
                };

                const newTransactions = [...state.transactions];
                newTransactions[existingTxIndex] = updatedTx;
                return { ...state, transactions: newTransactions };
            } else {
                const newTx: LoanTransaction = {
                    id: newId(),
                    borrowerId,
                    borrowerName: borrower.name,
                    category,
                    totalPrincipal: amount, // Start with this amount
                    totalDue: newEntry.totalDue,
                    paidAmount: 0,
                    status: 'Belum Lunas',
                    entries: [newEntry],
                    installments: [],
                    dueMonth: activeMonth,
                    createdAt: nowIso(),
                    updatedAt: nowIso(),
                    isPriority: isPriority || false
                };
                return { ...state, transactions: [newTx, ...state.transactions] };
            }
        }

        case 'MAKE_PAYMENT': {
            const { transactionId, amount, date, note } = action.payload;
            return {
                ...state,
                transactions: state.transactions.map(t => {
                    if (t.id !== transactionId) return t;
                    const newPaid = t.paidAmount + amount;
                    let newStatus: LoanTransaction['status'] = 'Cicil';
                    if (newPaid >= t.totalDue) newStatus = 'Lunas';

                    const newInstallment = {
                        id: newId(),
                        amount,
                        date,
                        note
                    };

                    return {
                        ...t,
                        paidAmount: newPaid,
                        status: newStatus,
                        installments: [...(t.installments || []), newInstallment],
                        updatedAt: nowIso()
                    };
                })
            };
        }

        case 'DELETE_PAYMENT': {
            const { transactionId, installmentId } = action.payload;
            return {
                ...state,
                transactions: state.transactions.map(t => {
                    if (t.id !== transactionId) return t;

                    const installment = t.installments?.find(i => i.id === installmentId);
                    if (!installment) return t;

                    const newPaid = t.paidAmount - installment.amount;
                    const newStatus = newPaid >= t.totalDue ? 'Lunas' : (newPaid > 0 ? 'Cicil' : 'Belum Lunas');

                    return {
                        ...t,
                        paidAmount: newPaid,
                        status: newStatus,
                        installments: t.installments?.filter(i => i.id !== installmentId) || [],
                        updatedAt: nowIso()
                    };
                })
            };
        }

        case 'UPDATE_CONFIG':
            return { ...state, config: { ...state.config, ...action.payload } };

        case 'DELETE_TRANSACTION':
            return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };

        case 'DELETE_TRANSACTIONS_BATCH':
            return {
                ...state,
                transactions: state.transactions.filter(t => !action.payload.includes(t.id))
            };

        case 'UPDATE_TRANSACTION': {
            const { id, totalPrincipal, totalDue, isPriority, paidAmount } = action.payload;
            return {
                ...state,
                transactions: state.transactions.map(t => {
                    if (t.id !== id) return t;

                    let finalPaidAmount = t.paidAmount;
                    let finalInstallments = [...(t.installments || [])];

                    // User is editing the payment amount directly
                    if (paidAmount !== undefined && paidAmount !== t.paidAmount) {
                        finalPaidAmount = paidAmount;
                        if (paidAmount === 0) {
                            finalInstallments = [];
                        } else {
                            // If they set a specific amount, create a manual adjustment record
                            // to replace the previous history so totals match.
                            finalInstallments = [{
                                id: newId(),
                                amount: paidAmount,
                                date: nowIso(),
                                note: "Penyesuaian Manual (Edit)"
                            }];
                        }
                    }

                    const newStatus = finalPaidAmount >= totalDue ? 'Lunas' : (finalPaidAmount > 0 ? 'Cicil' : 'Belum Lunas');

                    return {
                        ...t,
                        totalPrincipal,
                        totalDue,
                        paidAmount: finalPaidAmount,
                        installments: finalInstallments,
                        status: newStatus,
                        updatedAt: nowIso(),
                        isPriority: isPriority !== undefined ? isPriority : t.isPriority
                    };
                })
            };
        }

        case 'UPDATE_ARREAR': {
            const { id, totalPrincipal, totalDue, createdAt, dueMonth, isPriority, paidAmount } = action.payload as any;
            return {
                ...state,
                transactions: state.transactions.map(t => {
                    if (t.id !== id) return t;

                    let finalPaidAmount = t.paidAmount;
                    let finalInstallments = [...(t.installments || [])];

                    if (paidAmount !== undefined && paidAmount !== t.paidAmount) {
                        finalPaidAmount = paidAmount;
                        if (paidAmount === 0) {
                            finalInstallments = [];
                        } else {
                            finalInstallments = [{
                                id: newId(),
                                amount: paidAmount,
                                date: nowIso(),
                                note: "Penyesuaian Manual (Edit)"
                            }];
                        }
                    }

                    const newStatus = finalPaidAmount >= totalDue ? 'Lunas' : (finalPaidAmount > 0 ? 'Cicil' : 'Belum Lunas');

                    return {
                        ...t,
                        totalPrincipal,
                        totalDue,
                        createdAt,
                        dueMonth,
                        paidAmount: finalPaidAmount,
                        installments: finalInstallments,
                        status: newStatus,
                        updatedAt: nowIso(),
                        isPriority: isPriority !== undefined ? isPriority : t.isPriority
                    };
                })
            };
        }

        case 'ADD_ARREAR_MANUAL': {
            const newArrear = action.payload;

            // Only attempt to merge if the incoming transaction is actually an arrear
            if (newArrear.isArrear) {
                // Find existing active arrear to merge
                const existingIndex = state.transactions.findIndex(
                    t => t.isArrear && t.borrowerId === newArrear.borrowerId && t.status !== 'Lunas'
                );

                if (existingIndex >= 0) {
                    const existingTx = state.transactions[existingIndex];
                    const updatedTx = {
                        ...existingTx,
                        totalPrincipal: existingTx.totalPrincipal + newArrear.totalPrincipal,
                        totalDue: existingTx.totalDue + newArrear.totalDue,
                        entries: [...(existingTx.entries || []), ...(newArrear.entries || [])],
                        updatedAt: nowIso(),
                    };

                    const newTransactions = [...state.transactions];
                    newTransactions[existingIndex] = updatedTx;
                    return { ...state, transactions: newTransactions };
                }
            }

            // Normal fallback or if it's not an arrear
            return { ...state, transactions: [newArrear, ...state.transactions] };
        }

        case 'LOAD_STATE':
            return action.payload;

        default:
            return state;
    }
}

// ---------------------------------------------------------------------------
// Sinkronisasi data (outbox + retry + proteksi konflik)
// ---------------------------------------------------------------------------

export type SyncStatus = 'loading' | 'saved' | 'saving' | 'offline' | 'error';

/**
 * Catatan sinkronisasi untuk pengguna:
 * - ignored  : perubahan Anda TIDAK diterapkan (mis. datanya sudah dihapus di perangkat lain)
 * - overwrote: perubahan Anda menimpa perubahan yang lebih baru dari perangkat lain
 * - merged   : data digabung / diperbarui dari perangkat lain
 */
export type SyncNoticeKind = 'ignored' | 'overwrote' | 'merged';

export interface SyncNotice {
    id: string;
    kind: SyncNoticeKind;
    message: string;
    at: string; // ISO
}

export interface SyncInfo {
    status: SyncStatus;
    /** Jumlah perubahan yang belum terkonfirmasi tersimpan di server */
    pendingCount: number;
    lastSavedAt: string | null;
    errorMessage: string | null;
    /** Riwayat catatan sinkronisasi (terbaru di atas) */
    notices: SyncNotice[];
    clearNotices: () => void;
    /** Paksa sinkronisasi sekarang (tombol "Coba lagi" / "Sinkronkan sekarang") */
    syncNow: () => void;
}

type SyncInfoState = Omit<SyncInfo, 'syncNow' | 'clearNotices'>;

const STATE_KEY = 'web-pinjaman-data';
// Berisi nomor revisi server terakhir yang diketahui + antrean perubahan yang belum terkirim (outbox)
const SYNC_KEY = 'web-pinjaman-sync';

interface SyncMeta {
    rev: number | null; // null = server lama tanpa dukungan revisi
    actions: Action[]; // outbox
    forcePush?: boolean; // server kosong tapi data lokal ada -> kirim data lokal
}

const RETRY_DELAYS_MS = [2000, 5000, 15000, 30000, 60000];
const POLL_INTERVAL_MS = 30000; // cek perubahan dari perangkat lain saat tab aktif
const MAX_APPLIED_SEEDS = 500;
const MAX_NOTICES = 20;
const DEBOUNCE_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_CONFLICT_RETRIES = 5;

const loadLocalState = (): AppState => {
    try {
        const saved = localStorage.getItem(STATE_KEY);
        if (saved) return migrateState(JSON.parse(saved));
    } catch (e) {
        console.error('Failed to load local state', e);
    }
    return initialState;
};

export const clearLocalSyncData = () => {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(SYNC_KEY);
};

const loadSyncMeta = (): SyncMeta => {
    try {
        const saved = localStorage.getItem(SYNC_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                rev: typeof parsed.rev === 'number' ? parsed.rev : null,
                actions: Array.isArray(parsed.actions) ? parsed.actions : [],
                forcePush: !!parsed.forcePush
            };
        }
    } catch (e) {
        console.error('Failed to load sync meta', e);
    }
    return { rev: null, actions: [], forcePush: false };
};

interface PendingNotice {
    kind: SyncNoticeKind;
    message: string;
}

const formatRp = (n: number): string => `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;

// Memeriksa apakah sebuah aksi masih bisa diterapkan ke state saat ini.
// Mengembalikan catatan jika aksi akan diabaikan (target sudah dihapus) atau menimpa
// perubahan yang lebih baru dari perangkat lain.
const inspectAction = (
    state: AppState,
    action: Action
): { ignored: boolean; notice: PendingNotice | null } => {
    const findTx = (id: string) => state.transactions.find(t => t.id === id);
    const missingTx = (what: string) => ({
        ignored: true,
        notice: {
            kind: 'ignored' as const,
            message: `${what} tidak diterapkan karena transaksi sudah dihapus dari perangkat lain.`
        }
    });
    const overwrite = (t: LoanTransaction) => {
        if (action._ts && t.updatedAt && t.updatedAt > action._ts) {
            return {
                ignored: false,
                notice: {
                    kind: 'overwrote' as const,
                    message: `Perubahan Anda pada transaksi "${t.borrowerName}" menimpa perubahan yang dibuat di perangkat lain.`
                }
            };
        }
        return { ignored: false, notice: null };
    };

    switch (action.type) {
        case 'ADD_LOAN': {
            const borrower = state.borrowers.find(b => b.id === action.payload.borrowerId);
            if (!borrower) {
                return {
                    ignored: true,
                    notice: {
                        kind: 'ignored',
                        message: `Pinjaman baru ${formatRp(action.payload.amount)} tidak tersimpan karena peminjam sudah dihapus dari perangkat lain.`
                    }
                };
            }
            break;
        }
        case 'UPDATE_BORROWER': {
            if (!state.borrowers.some(b => b.id === action.payload.id)) {
                return {
                    ignored: true,
                    notice: {
                        kind: 'ignored',
                        message: `Perubahan data peminjam "${action.payload.name}" tidak diterapkan karena peminjam sudah dihapus dari perangkat lain.`
                    }
                };
            }
            break;
        }
        case 'MAKE_PAYMENT': {
            if (!findTx(action.payload.transactionId)) {
                return missingTx(`Pembayaran ${formatRp(action.payload.amount)}`);
            }
            break;
        }
        case 'DELETE_PAYMENT': {
            if (!findTx(action.payload.transactionId)) return missingTx('Penghapusan cicilan');
            break;
        }
        case 'UPDATE_TRANSACTION':
        case 'UPDATE_ARREAR': {
            const t = findTx(action.payload.id);
            if (!t) return missingTx('Perubahan transaksi');
            return overwrite(t);
        }
        case 'MOVE_LOAN_CATEGORY': {
            const t = findTx(action.payload.id);
            if (!t) return missingTx('Perpindahan kategori transaksi');
            return overwrite(t);
        }
        default:
            break;
    }
    return { ignored: false, notice: null };
};

type ApplyOutcome = 'applied' | 'duplicate' | 'ignored';

// Menerapkan satu aksi dengan pencatatan ID aksi (anti-duplikat) dan pemeriksaan target.
const applyTracked = (
    state: AppState,
    action: Action
): { state: AppState; outcome: ApplyOutcome; notice: PendingNotice | null } => {
    const seed = action._seed;
    const prevSeeds = state.appliedSeeds || [];

    // Aksi ini sudah pernah diterapkan (mis. sudah tersimpan di server) -> lewati
    if (seed && prevSeeds.includes(seed)) {
        return { state, outcome: 'duplicate', notice: null };
    }

    const { ignored, notice } = inspectAction(state, action);
    if (ignored) {
        return { state, outcome: 'ignored', notice };
    }

    let next = appReducer(state, action);
    if (seed) {
        next = { ...next, appliedSeeds: [...prevSeeds, seed].slice(-MAX_APPLIED_SEEDS) };
    }
    return { state: next, outcome: 'applied', notice };
};

// Memutar ulang aksi-aksi outbox di atas state dasar (dari server).
// Aksi yang sudah ada di server (duplikat) atau tidak bisa diterapkan (diabaikan) dibuang dari antrean.
const replayActions = (base: AppState, actions: Action[]) => {
    let acc = base;
    const notices: PendingNotice[] = [];
    const kept: Action[] = [];
    let duplicates = 0;

    for (const action of actions) {
        const result = applyTracked(acc, action);
        if (result.outcome === 'duplicate') {
            duplicates++;
            continue;
        }
        if (result.notice) notices.push(result.notice);
        if (result.outcome === 'ignored') continue;
        acc = result.state;
        kept.push(action);
    }

    return { state: acc, notices, kept, duplicates };
};

const makeSeed = (): string =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

const fetchWithTimeout = async (url: string, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

// Context Creation
const AppContext = createContext<{
    state: AppState;
    dispatch: (action: Action) => void;
    sync: SyncInfo;
}>({
    state: initialState,
    dispatch: () => null,
    sync: {
        status: 'loading',
        pendingCount: 0,
        lastSavedAt: null,
        errorMessage: null,
        notices: [],
        clearNotices: () => null,
        syncNow: () => null
    }
});

const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

// Di hosting, jangan pernah memanggil localhost: itu komputer pengunjung, bukan server.
const resolveApiUrl = (): string => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const pageIsLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const configuredIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(\/|$)/i.test(configuredApiUrl);
    if (configuredApiUrl && !(configuredIsLocal && !pageIsLocal)) return configuredApiUrl;
    return '/api';
};

// Provider Component
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const API_URL = resolveApiUrl();

    // Muat state & outbox dari LocalStorage dulu (tampil instan, juga saat offline)
    const initRef = useRef<{ state: AppState; meta: SyncMeta } | null>(null);
    if (initRef.current === null) {
        initRef.current = { state: loadLocalState(), meta: loadSyncMeta() };
    }

    // stateRef = sumber kebenaran sinkron (selalu terbaru); state = salinan untuk render
    const stateRef = useRef<AppState>(initRef.current.state);
    const metaRef = useRef<SyncMeta>(initRef.current.meta);
    const [state, setState] = useState<AppState>(initRef.current.state);
    const [syncInfo, setSyncInfo] = useState<SyncInfoState>({
        status: 'loading',
        pendingCount: initRef.current.meta.actions.length,
        lastSavedAt: null,
        errorMessage: null,
        notices: []
    });

    const { showToast } = useToast();
    const showToastRef = useRef(showToast);
    showToastRef.current = showToast;

    const serverLoadedRef = useRef(false); // sudah berhasil mengambil data server minimal sekali
    const remoteCheckSupportedRef = useRef(true); // server mendukung endpoint cek revisi ringan
    const syncingRef = useRef(false);
    const rerunRef = useRef(false);
    const attemptRef = useRef(0);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const persist = useCallback(() => {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(stateRef.current));
            localStorage.setItem(SYNC_KEY, JSON.stringify(metaRef.current));
        } catch (e) {
            console.error('Gagal menyimpan ke LocalStorage', e);
        }
    }, []);

    const hasPending = () => metaRef.current.actions.length > 0 || !!metaRef.current.forcePush;

    const patchSync = useCallback((patch: Partial<SyncInfoState>) => {
        setSyncInfo(prev => ({ ...prev, pendingCount: metaRef.current.actions.length, ...patch }));
    }, []);

    // Simpan catatan ke riwayat dan tampilkan notifikasi (toast) agar pengguna tahu apa yang terjadi
    const emitNotices = useCallback((list: PendingNotice[]) => {
        if (list.length === 0) return;
        const at = new Date().toISOString();
        const entries: SyncNotice[] = list.map(n => ({ id: generateId(), kind: n.kind, message: n.message, at }));
        setSyncInfo(prev => ({ ...prev, notices: [...entries.reverse(), ...prev.notices].slice(0, MAX_NOTICES) }));

        const toast = showToastRef.current;
        if (list.length <= 2) {
            list.forEach(n => toast(n.message, n.kind === 'merged' ? 'info' : 'warning', 8000));
        } else {
            const problems = list.filter(n => n.kind !== 'merged').length;
            toast(
                `${list.length} catatan sinkronisasi${problems > 0 ? `, ${problems} perubahan bermasalah` : ''}. Lihat di menu Data & Backup.`,
                problems > 0 ? 'warning' : 'info',
                8000
            );
        }
    }, []);

    // Terapkan snapshot dari server: state = data server + (replay outbox jika ada)
    const applyServerSnapshot = useCallback((body: any) => {
        let rev: number | null = null;
        let data: any = null;
        if (body && typeof body === 'object' && 'rev' in body && 'data' in body) {
            rev = Number(body.rev) || 0;
            data = body.data;
        } else {
            data = body; // server lama: data langsung, tanpa revisi
        }

        const meta = metaRef.current;
        const prevRev = meta.rev;
        meta.rev = rev;

        if (data && data.transactions) {
            const pendingBefore = meta.actions.length;
            const replay = replayActions(migrateState(data), meta.actions);
            stateRef.current = replay.state;
            meta.actions = replay.kept; // buang aksi yang sudah ada di server / tidak bisa diterapkan
            meta.forcePush = false;

            const notices = [...replay.notices];

            // Revisi server berubah sejak terakhir kita lihat -> ada perubahan dari perangkat lain.
            // Jika seluruh antrean ternyata sudah ada di server, itu hanya kiriman kita sendiri (respons hilang).
            const remoteChanged = prevRev !== null && rev !== null && rev !== prevRev;
            const onlyOwnChanges = pendingBefore > 0 && replay.duplicates === pendingBefore;
            if (remoteChanged && !onlyOwnChanges) {
                notices.unshift({
                    kind: 'merged',
                    message: pendingBefore > 0
                        ? 'Perubahan Anda digabung dengan perubahan dari perangkat lain.'
                        : 'Data diperbarui dari perangkat lain.'
                });
            }
            emitNotices(notices);
        } else {
            // Server masih kosong: kirim data lokal bila ada isinya
            const local = stateRef.current;
            if (local.borrowers.length > 0 || local.transactions.length > 0) {
                meta.forcePush = true;
            }
        }
        setState(stateRef.current);
        persist();
    }, [persist, emitNotices]);

    const runSync = useCallback(async (opts?: { checkRemote?: boolean }) => {
        if (!navigator.onLine) {
            patchSync({ status: 'offline', errorMessage: null });
            return;
        }

        if (hasPending()) patchSync({ status: 'saving', errorMessage: null });

        // Langkah 1: pastikan data server sudah pernah diambil (agar tidak menimpa data server)
        if (!serverLoadedRef.current) {
            const res = await fetchWithTimeout(`${API_URL}/state?v=2`);
            if (!res.ok) throw new Error(`Server menjawab ${res.status}`);
            applyServerSnapshot(await res.json());
            serverLoadedRef.current = true;
        }

        // Langkah 2 (opsional): tidak ada yang tertunda -> cek apakah perangkat lain mengubah data
        if (opts?.checkRemote && !hasPending() && remoteCheckSupportedRef.current && metaRef.current.rev !== null) {
            const revRes = await fetchWithTimeout(`${API_URL}/state/rev`, undefined, 10000);
            if (revRes.status === 404) {
                remoteCheckSupportedRef.current = false; // server lama, tidak ada endpoint ringan
            } else if (revRes.ok) {
                const { rev: serverRev } = await revRes.json();
                if (typeof serverRev === 'number' && serverRev !== metaRef.current.rev && !hasPending()) {
                    const full = await fetchWithTimeout(`${API_URL}/state?v=2`);
                    if (full.ok) applyServerSnapshot(await full.json());
                }
            }
        }

        // Langkah 3: kirim perubahan yang tertunda (outbox)
        let conflicts = 0;
        let pushed = false;
        while (hasPending()) {
            const meta = metaRef.current;
            const sentSeeds = new Set(meta.actions.map(a => a._seed));
            const sentForce = !!meta.forcePush;
            const snapshot = stateRef.current;

            const body = meta.rev === null
                ? snapshot // server lama (tanpa revisi): kirim state langsung
                : { baseRev: meta.rev, data: snapshot };

            const res = await fetchWithTimeout(`${API_URL}/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.status === 409) {
                // Perangkat lain sudah menyimpan lebih dulu -> ambil data terbaru, putar ulang outbox, kirim lagi
                conflicts++;
                if (conflicts > MAX_CONFLICT_RETRIES) throw new Error('Terlalu banyak konflik data, coba lagi nanti');
                applyServerSnapshot(await res.json());
                continue;
            }

            if (!res.ok) throw new Error(`Server menjawab ${res.status}`);

            const result = await res.json().catch(() => ({} as any));

            // Ambil referensi terbaru (tab lain bisa saja mengganti isi meta selama request berjalan)
            const current = metaRef.current;
            if (typeof result.rev === 'number') current.rev = result.rev;

            // Hapus hanya aksi yang benar-benar sudah terkirim (aksi baru selama request tetap tersimpan)
            current.actions = current.actions.filter(a => !sentSeeds.has(a._seed));
            if (sentForce) current.forcePush = false;
            pushed = true;
            persist();
            patchSync({ status: 'saving' });
        }

        attemptRef.current = 0;
        patchSync({
            status: 'saved',
            errorMessage: null,
            ...(pushed ? { lastSavedAt: new Date().toISOString() } : {})
        });
    }, [API_URL, applyServerSnapshot, patchSync, persist]);

    const syncNow = useCallback(async (opts?: { checkRemote?: boolean }) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

        if (syncingRef.current) {
            rerunRef.current = true;
            return;
        }
        syncingRef.current = true;

        try {
            await runSync(opts);
        } catch (err) {
            attemptRef.current += 1;
            const e = err as Error;
            const isNetworkError = !navigator.onLine || e instanceof TypeError || e?.name === 'AbortError';
            patchSync({
                status: isNetworkError ? 'offline' : 'error',
                errorMessage: isNetworkError ? 'Tidak dapat terhubung ke server' : (e?.message || 'Gagal menyimpan')
            });

            // Coba lagi otomatis dengan jeda bertahap
            const delay = RETRY_DELAYS_MS[Math.min(attemptRef.current - 1, RETRY_DELAYS_MS.length - 1)];
            retryTimerRef.current = setTimeout(() => { void syncNow(); }, delay);
        } finally {
            syncingRef.current = false;
            if (rerunRef.current) {
                rerunRef.current = false;
                void syncNow();
            }
        }
    }, [runSync, patchSync]);

    const scheduleSync = useCallback((delay: number) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => { void syncNow(); }, delay);
    }, [syncNow]);

    // Dispatch baru: jalankan reducer, catat ke outbox, simpan lokal, jadwalkan kirim ke server
    const dispatch = useCallback((action: Action) => {
        const stamped = { ...action, _seed: makeSeed(), _ts: new Date().toISOString() } as Action;

        const result = applyTracked(stateRef.current, stamped);
        if (result.outcome === 'ignored') return; // target tidak ada lagi, tidak perlu dicatat

        stateRef.current = result.state;
        setState(stateRef.current);

        const meta = metaRef.current;
        if (stamped.type === 'LOAD_STATE') {
            // Mengganti seluruh data: aksi-aksi sebelumnya tidak relevan lagi
            meta.actions = [stamped];
        } else {
            meta.actions.push(stamped);
        }
        persist();

        setSyncInfo(prev => ({
            ...prev,
            pendingCount: meta.actions.length,
            status: !navigator.onLine ? 'offline' : (prev.status === 'loading' ? 'loading' : 'saving')
        }));
        scheduleSync(DEBOUNCE_MS);
    }, [persist, scheduleSync]);

    // Ambil data server saat aplikasi dibuka + kirim outbox yang tertinggal dari sesi sebelumnya
    useEffect(() => {
        void syncNow();
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [syncNow]);

    // Koneksi kembali / tab dibuka lagi -> langsung sinkron
    useEffect(() => {
        const handleOnline = () => {
            attemptRef.current = 0;
            void syncNow();
        };
        const handleOffline = () => {
            patchSync({ status: 'offline', errorMessage: null });
        };
        const handleVisibility = () => {
            if (document.visibilityState !== 'visible') return;
            if (hasPending() || !serverLoadedRef.current) {
                void syncNow();
            } else {
                // Tab dibuka lagi: pastikan data tidak usang
                void syncNow({ checkRemote: true });
            }
        };
        // Peringatan jika menutup halaman saat masih ada perubahan yang belum tersimpan
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasPending()) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [syncNow, patchSync]);

    // Cek berkala perubahan dari perangkat lain selama tab aktif dan tidak ada perubahan tertunda
    useEffect(() => {
        const timer = setInterval(() => {
            if (
                document.visibilityState === 'visible' &&
                navigator.onLine &&
                serverLoadedRef.current &&
                !hasPending() &&
                !syncingRef.current
            ) {
                void syncNow({ checkRemote: true });
            }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [syncNow]);

    // Beberapa tab di browser yang sama berbagi LocalStorage: ikuti perubahan dari tab lain
    // agar antrean tidak saling menimpa. (Event 'storage' hanya muncul di tab LAIN.)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key !== null && e.key !== STATE_KEY && e.key !== SYNC_KEY) return;
            stateRef.current = loadLocalState();
            metaRef.current = loadSyncMeta();
            setState(stateRef.current);
            patchSync({});
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [patchSync]);

    const triggerSync = useCallback(() => {
        attemptRef.current = 0;
        void syncNow();
    }, [syncNow]);

    const clearNotices = useCallback(() => {
        setSyncInfo(prev => ({ ...prev, notices: [] }));
    }, []);

    // Google Sheets Auto Sync
    useEffect(() => {
        if (state.config.enableAutoSync && state.config.googleScriptUrl) {
            import('../utils/googleSync').then(({ syncToGoogleSheets }) => {
                syncToGoogleSheets(state.config.googleScriptUrl!, state);
            });
        }
    }, [state.transactions, state.borrowers, state.config.enableAutoSync, state.config.googleScriptUrl]);

    return (
        <AppContext.Provider value={{ state, dispatch, sync: { ...syncInfo, clearNotices, syncNow: triggerSync } }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);

