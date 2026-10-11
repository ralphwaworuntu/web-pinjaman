import { useState } from 'react';
import { useApp } from '../context/AppContext';
import FinancialSummary from './FinancialSummary';
import LoanTable from './LoanTable';
import MonthYearSelect from './MonthYearSelect';
import { LayoutDashboard, Calendar, ChevronDown } from 'lucide-react';

type ViewMode = 'overview' | 'monthly' | 'yearly';

export default function Dashboard() {
    const { state } = useApp();
    const [viewMode, setViewMode] = useState<ViewMode>('monthly');

    // Default to the first active month if available, otherwise just use a placeholder or the first available month.
    // Ideally, we want the "Active Cycle" month.
    const defaultMonth = state.config.activeCycle === 'Gaji' ? state.config.activeMonthGaji : state.config.activeMonthRemon;
    const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

    // Default Year: Extract from active month or current system year
    const currentYear = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState<string>(currentYear);

    // Get all unique months for the dropdown
    const availableMonths = state.config.availableMonths && state.config.availableMonths.length > 0
        ? state.config.availableMonths
        : [defaultMonth]; // Fallback

    // Get available years from transactions or config
    // For now, let's generate a range or extract from availableMonths
    const availableYears = Array.from(new Set([
        ...(state.config.availableMonths?.map(m => m.split(' ')[1]) || []),
        new Date().getFullYear().toString()
    ])).sort().reverse();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Dashboard Submenu Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm w-full">
                <div className="segmented-control w-full grid grid-cols-3 sm:w-auto sm:flex sm:grid-cols-none">
                    <button
                        onClick={() => setViewMode('overview')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:px-5 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all duration-300 ${viewMode === 'overview'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <LayoutDashboard size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>Overview</span>
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:px-5 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all duration-300 ${viewMode === 'monthly'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>Bulanan</span>
                    </button>
                    <button
                        onClick={() => setViewMode('yearly')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:px-5 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all duration-300 ${viewMode === 'yearly'
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>Tahunan</span>
                    </button>
                </div>

                {viewMode === 'monthly' && (
                    <MonthYearSelect
                        months={availableMonths}
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                        className="w-full sm:w-auto sm:min-w-[22rem]"
                        selectClassName="w-full appearance-none bg-slate-800 border border-slate-700 text-white text-sm font-bold pl-4 pr-9 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer hover:bg-slate-700 transition-colors bg-none [&>option]:bg-slate-900"
                    />
                )}

                {viewMode === 'yearly' && (
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="appearance-none bg-slate-800 border border-slate-700 text-white text-sm font-bold pl-4 pr-10 py-2.5 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer hover:bg-slate-750 transition-colors bg-none"
                        >
                            {availableYears.map((year) => (
                                <option key={year} value={year}>
                                    Tahun {year}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div>
                <FinancialSummary
                    selectedMonth={viewMode === 'monthly' ? selectedMonth : undefined}
                    selectedYear={viewMode === 'yearly' ? selectedYear : undefined}
                />

                <div className="mt-8">
                    <LoanTable
                        selectedMonth={viewMode === 'monthly' ? selectedMonth : undefined}
                        selectedYear={viewMode === 'yearly' ? selectedYear : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
