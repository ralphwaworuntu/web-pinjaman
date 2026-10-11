// Helper periode "Bulan Tahun". Data tetap disimpan sebagai teks gabungan, mis. "Maret 2026".

export const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
] as const;

/** Nilai khusus filter: semua periode. */
export const ALL_PERIOD = 'Semua';
/** Nilai khusus filter: periode aktif tiap kategori (dipakai di Tandai Lunas). */
export const ACTIVE_PERIOD = 'Aktif';

const YEAR_PREFIX = 'Tahun ';

export const parseMonth = (value: string): { month: string; year: string } | null => {
    const parts = (value || '').trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const [month, year] = parts;
    if (!/^\d{4}$/.test(year) || month === 'Tahun') return null;
    return { month, year };
};

export const joinMonth = (month: string, year: string | number): string => `${month} ${year}`;

export const yearPeriod = (year: string): string => `${YEAR_PREFIX}${year}`;

export const parseYearPeriod = (value: string): string | null =>
    value.startsWith(YEAR_PREFIX) ? value.slice(YEAR_PREFIX.length) : null;

const monthIndex = (name: string): number => {
    const i = (MONTH_NAMES as readonly string[]).indexOf(name);
    return i === -1 ? 99 : i;
};

export const compareMonths = (a: string, b: string): number => {
    const pa = parseMonth(a);
    const pb = parseMonth(b);
    if (!pa || !pb) return a.localeCompare(b);
    const yearDiff = parseInt(pa.year) - parseInt(pb.year);
    if (yearDiff !== 0) return yearDiff;
    return monthIndex(pa.month) - monthIndex(pb.month);
};

export const sortMonthList = (months: string[]): string[] => [...months].sort(compareMonths);

/** Daftar tahun unik, terbaru di atas. */
export const yearsOf = (months: string[]): string[] =>
    Array.from(new Set(months.map(m => parseMonth(m)?.year).filter((y): y is string => !!y)))
        .sort((a, b) => parseInt(b) - parseInt(a));

/** Nama bulan yang ada pada satu tahun, urut Januari sampai Desember. */
export const monthsOfYear = (months: string[], year: string): string[] =>
    months
        .map(parseMonth)
        .filter((p): p is { month: string; year: string } => !!p && p.year === year)
        .map(p => p.month)
        .sort((a, b) => monthIndex(a) - monthIndex(b));

/** Apakah bulan tagihan cocok dengan nilai filter periode (ALL, "Tahun 2026", atau "Maret 2026"). */
export const matchesPeriod = (dueMonth: string, value: string): boolean => {
    if (value === ALL_PERIOD) return true;
    const year = parseYearPeriod(value);
    if (year) return parseMonth(dueMonth)?.year === year;
    return dueMonth === value;
};

export const periodLabel = (value: string): string => {
    if (value === ALL_PERIOD) return 'Semua Waktu';
    return value;
};
