import type { ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SyncStatusProps {
    /** Tampilan ringkas (hanya ikon + teks pendek) untuk ruang sempit */
    compact?: boolean;
}

export default function SyncStatus({ compact = false }: SyncStatusProps) {
    const { sync } = useApp();
    const { status, pendingCount, errorMessage, syncNow } = sync;

    let label: string;
    let detail: string | null = null;
    let tone: string;
    let icon: ReactNode;
    let canRetry = false;

    switch (status) {
        case 'saved':
            label = 'Tersimpan';
            tone = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
            icon = <CheckCircle2 size={14} />;
            break;
        case 'saving':
            label = pendingCount > 0 ? `Menyimpan ${pendingCount} perubahan...` : 'Menyimpan...';
            tone = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
            icon = <RefreshCw size={14} className="animate-spin" />;
            break;
        case 'offline':
            label = pendingCount > 0 ? `Offline - ${pendingCount} perubahan belum tersimpan` : 'Offline';
            detail = pendingCount > 0
                ? 'Akan tersimpan otomatis saat koneksi kembali'
                : 'Data aman di perangkat ini';
            tone = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
            icon = <CloudOff size={14} />;
            canRetry = true;
            break;
        case 'error':
            label = pendingCount > 0 ? `Gagal - ${pendingCount} perubahan belum tersimpan` : 'Gagal menyimpan';
            detail = errorMessage;
            tone = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
            icon = <AlertTriangle size={14} />;
            canRetry = true;
            break;
        default:
            label = 'Memuat data...';
            tone = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
            icon = <Cloud size={14} className="animate-pulse" />;
            break;
    }

    // Teks ringkas untuk mode compact
    const compactLabel =
        status === 'saved' ? 'Tersimpan'
            : status === 'saving' ? 'Menyimpan'
                : status === 'offline' ? (pendingCount > 0 ? `Offline (${pendingCount})` : 'Offline')
                    : status === 'error' ? (pendingCount > 0 ? `Gagal (${pendingCount})` : 'Gagal')
                        : 'Memuat';

    return (
        <div
            role="status"
            aria-live="polite"
            title={detail ? `${label}. ${detail}` : label}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-bold ${tone}`}
        >
            <span className="shrink-0">{icon}</span>
            {compact ? (
                <span className="whitespace-nowrap">{compactLabel}</span>
            ) : (
                <span className="flex flex-col leading-tight">
                    <span>{label}</span>
                    {detail && <span className="text-[10px] font-medium opacity-80">{detail}</span>}
                </span>
            )}
            {canRetry && (
                <button
                    type="button"
                    onClick={syncNow}
                    className="ml-1 underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
                >
                    Coba lagi
                </button>
            )}
        </div>
    );
}
