import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { Borrower, LoanTransaction, AppConfig, LoanEntry } from '../types';
import { calculateTotalDue } from '../utils/loanCalculator';
import { generateId } from '../utils/idGenerator';

// State Definition
interface AppState {
    borrowers: Borrower[];
    transactions: LoanTransaction[];
    config: AppConfig;
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

// Actions
type Action =
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
    | { type: 'DELETE_PAYMENT'; payload: { transactionId: string; installmentId: string } };

// Reducer
function appReducer(state: AppState, action: Action): AppState {
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
                        updatedAt: new Date().toISOString()
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
                id: generateId(),
                borrowerId,
                category,
                amount,
                interestRate: rate,
                totalDue: calculateTotalDue(amount, rate),
                date: new Date().toISOString()
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
                    updatedAt: new Date().toISOString(),
                    status: existingTx.paidAmount > 0 ? 'Cicil' : 'Belum Lunas',
                    dueMonth: activeMonth,
                    isPriority: isPriority !== undefined ? isPriority : existingTx.isPriority
                };

                const newTransactions = [...state.transactions];
                newTransactions[existingTxIndex] = updatedTx;
                return { ...state, transactions: newTransactions };
            } else {
                const newTx: LoanTransaction = {
                    id: generateId(),
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
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
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
                        id: generateId(),
                        amount,
                        date,
                        note
                    };

                    return {
                        ...t,
                        paidAmount: newPaid,
                        status: newStatus,
                        installments: [...(t.installments || []), newInstallment],
                        updatedAt: new Date().toISOString()
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
                        updatedAt: new Date().toISOString()
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
                                id: generateId(),
                                amount: paidAmount,
                                date: new Date().toISOString(),
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
                        updatedAt: new Date().toISOString(),
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
                                id: generateId(),
                                amount: paidAmount,
                                date: new Date().toISOString(),
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
                        updatedAt: new Date().toISOString(),
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
                        updatedAt: new Date().toISOString(),
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

// Context Creation
const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => null });

// Provider Component
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    // Flag to track if initial cloud fetch has completed
    const [isLoaded, setIsLoaded] = useState(false);

    // API URL dynamically adapting to Env or relative path if deployed properly
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Initialize from LocalStorage first (for instant offline cache reading)
    const [state, dispatch] = useReducer(appReducer, initialState, (defaultState) => {
        try {
            const saved = localStorage.getItem('web-pinjaman-data');
            if (saved) {
                const parsed = JSON.parse(saved);
                return migrateState(parsed);
            }
        } catch (e) {
            console.error("Failed to load local state", e);
        }
        return defaultState;
    });

    // Fetch from Cloud Database on App Load
    useEffect(() => {
        const fetchStateFromServer = async () => {
            try {
                const res = await fetch(`${API_URL}/state`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.transactions) {
                        dispatch({ type: 'LOAD_STATE', payload: migrateState(data) });
                    }
                }
            } catch (err) {
                console.warn("Server belum ada atau bermasalah, memakai LocalStorage", err);
            } finally {
                // Ensure we know it has loaded (so we can start saving updates)
                setIsLoaded(true);
            }
        };

        fetchStateFromServer();
    }, [API_URL]);

    // Save to server AND local storage on state change
    useEffect(() => {
        // Tetap simpan ke LocalStorage agar lebih aman & cepat saat offline.
        localStorage.setItem('web-pinjaman-data', JSON.stringify(state));

        // JANGAN kirim state ke server SEBELUM kita selesai mendownload data terbaru
        // dari server! (Mencegah kita malah mereplace data server dengan array kosong lokal).
        if (!isLoaded) return;

        // Tunda penyimpanan ke database (Debounce) untuk menghindari spam request
        const saveTimeout = setTimeout(async () => {
            try {
                await fetch(`${API_URL}/state`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state)
                });
            } catch (err) {
                console.error("Gagal menyimpan data ke database server", err);
            }
        }, 1500); // 1.5 detik cooldown 

        return () => clearTimeout(saveTimeout);
    }, [state, isLoaded, API_URL]);

    // Google Sheets Auto Sync
    useEffect(() => {
        if (state.config.enableAutoSync && state.config.googleScriptUrl) {
            import('../utils/googleSync').then(({ syncToGoogleSheets }) => {
                syncToGoogleSheets(state.config.googleScriptUrl!, state);
            });
        }
    }, [state.transactions, state.borrowers, state.config.enableAutoSync, state.config.googleScriptUrl]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);

