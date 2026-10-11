import { ChevronDown } from 'lucide-react';
import {
    ACTIVE_PERIOD,
    ALL_PERIOD,
    joinMonth,
    monthsOfYear,
    parseMonth,
    parseYearPeriod,
    yearPeriod,
    yearsOf
} from '../utils/month';

interface MonthYearSelectProps {
    /** Daftar bulan yang tersedia, mis. ["Maret 2026", "April 2026"]. */
    months: string[];
    /** "Maret 2026", "Tahun 2026" (bila allowAll), ALL_PERIOD (bila allowAll), atau ACTIVE_PERIOD (bila allowActive). */
    value: string;
    onChange: (value: string) => void;
    /** Tambah opsi "Semua Tahun" dan "Semua Bulan". */
    allowAll?: boolean;
    /** Tambah opsi "Periode Aktif" pada pilihan tahun. */
    allowActive?: boolean;
    activeLabel?: string;
    className?: string;
    selectClassName?: string;
    /** Ikon di kiri dropdown tahun (opsional). */
    leftIcon?: React.ReactNode;
}

const DEFAULT_SELECT_CLASS =
    'w-full appearance-none bg-slate-800 border border-slate-700 text-white text-sm font-bold pl-3 pr-8 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [&>option]:bg-slate-900 [&>option]:text-slate-200';

export default function MonthYearSelect({
    months,
    value,
    onChange,
    allowAll = false,
    allowActive = false,
    activeLabel = 'Periode Aktif',
    className = '',
    selectClassName = DEFAULT_SELECT_CLASS,
    leftIcon
}: MonthYearSelectProps) {
    const isActive = allowActive && value === ACTIVE_PERIOD;
    const isAll = allowAll && value === ALL_PERIOD;
    const yearOnly = allowAll ? parseYearPeriod(value) : null;
    const parsed = parseMonth(value);

    const yearValue = isActive ? ACTIVE_PERIOD : isAll ? ALL_PERIOD : yearOnly ?? parsed?.year ?? '';
    const monthValue = parsed ? parsed.month : '';

    const knownMonths = parsed && !months.includes(value) ? [...months, value] : months;
    const years = yearsOf(knownMonths);
    const monthsInYear = parsed || yearOnly ? monthsOfYear(knownMonths, yearOnly ?? parsed!.year) : [];

    const handleYearChange = (year: string) => {
        if (year === ACTIVE_PERIOD || year === ALL_PERIOD) {
            onChange(year);
            return;
        }
        const monthsOfNewYear = monthsOfYear(knownMonths, year);
        if (monthValue && monthsOfNewYear.includes(monthValue)) {
            onChange(joinMonth(monthValue, year));
        } else if (allowAll) {
            onChange(yearPeriod(year));
        } else if (monthsOfNewYear.length > 0) {
            onChange(joinMonth(monthsOfNewYear[0], year));
        }
    };

    const handleMonthChange = (month: string) => {
        const year = yearOnly ?? parsed?.year;
        if (!year) return;
        onChange(month === ALL_PERIOD ? yearPeriod(year) : joinMonth(month, year));
    };

    const monthSelectDisabled = isActive || isAll || !yearValue;

    return (
        <div className={`grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 ${className}`}>
            <div className={`relative ${isActive ? 'col-span-2' : ''}`}>
                {leftIcon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                        {leftIcon}
                    </span>
                )}
                <select
                    aria-label="Tahun"
                    value={yearValue}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className={`${selectClassName} ${leftIcon ? 'pl-9' : ''}`}
                >
                    {allowActive && <option value={ACTIVE_PERIOD}>{activeLabel}</option>}
                    {allowAll && <option value={ALL_PERIOD}>Semua Tahun</option>}
                    {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className={`relative ${isActive ? 'hidden' : ''}`}>
                <select
                    aria-label="Bulan"
                    value={monthSelectDisabled ? '' : monthValue || ALL_PERIOD}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    disabled={monthSelectDisabled}
                    className={selectClassName}
                >
                    {monthSelectDisabled && (
                        <option value="">{isActive ? 'Sesuai aktif' : 'Semua Bulan'}</option>
                    )}
                    {!monthSelectDisabled && allowAll && <option value={ALL_PERIOD}>Semua Bulan</option>}
                    {monthsInYear.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
}
