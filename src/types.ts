export type LoanCategory = 'Gaji' | 'Remon';

export interface Borrower {
    id: string;
    name: string;
    limit: number;
    isHidden?: boolean;
}

export interface Installment {
    id: string;
    amount: number;
    date: string; // ISO String
    note?: string;
}

export interface LoanEntry {
    id: string;
    borrowerId: string;
    category: LoanCategory;
    amount: number; // Principal
    interestRate: number; // 10 or 20
    totalDue: number; // Calculated with interest
    date: string; // ISO String
}

export interface LoanTransaction {
    id: string;
    borrowerId: string;
    borrowerName: string;
    category: LoanCategory;
    totalPrincipal: number;
    totalDue: number;
    paidAmount: number;
    status: 'Lunas' | 'Cicil' | 'Belum Lunas';
    entries: LoanEntry[]; // History of merged loans
    installments: Installment[]; // History of payments
    dueMonth: string; // E.g., "Maret 2026" - To track which cycle this belongs to
    createdAt: string;
    updatedAt: string;
    isArrear?: boolean; // Flag to identify if this is a manual arrear entry
    isPriority?: boolean; // Flag to identify if this is a priority customer/loan
}

export interface AppConfig {
    activeCycle: LoanCategory; // Which tab is active (affects input default)

    // Settings for Gaji
    activeMonthGaji: string;
    interestRateGaji: number;

    // Settings for Remon
    activeMonthRemon: string;
    interestRateRemon: number;

    // Google Sheets Sync
    googleScriptUrl?: string;
    enableAutoSync?: boolean;

    // System
    version?: number;
    availableMonths?: string[]; // List of months available for selection
}

export interface FinancialSummary {
    category: LoanCategory | 'All';
    totalModal: number;
    totalPiutang: number;
    profitProjection: number;
    totalPaid: number;
    outstanding: number;
}

export interface User {
    username: string;
    role: 'admin';
}
