import React, { useRef } from 'react';
import { useApp, clearLocalSyncData } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Download, Upload, RefreshCw, Database, AlertTriangle, Cloud } from 'lucide-react';

export default function DatabaseManager() {
    const { state, dispatch, sync } = useApp();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = () => {
        try {
            const dataStr = JSON.stringify(state, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const date = new Date().toISOString().split('T')[0];
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup-pinjaman-${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast('Backup data berhasil didownload', 'success');
        } catch (error) {
            console.error('Backup failed:', error);
            showToast('Gagal melakukan backup data', 'error');
        }
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsedData = JSON.parse(content);

                // Simple validation check
                if (!parsedData.transactions || !parsedData.borrowers) {
                    throw new Error('Format file tidak valid');
                }

                if (window.confirm('PERINGATAN: Restore akan menimpa semua data saat ini. Lanjutkan?')) {
                    dispatch({ type: 'LOAD_STATE', payload: parsedData });
                    showToast('Data berhasil direstore', 'success');
                }
            } catch (error) {
                console.error('Restore failed:', error);
                showToast('Gagal memproses file backup', 'error');
            }

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        if (window.confirm('BAHAYA: Apakah Anda yakin ingin menghapus SEMUA data? Data tidak dapat dikembalikan!')) {
            if (window.confirm('Konfirmasi terakhir: Hapus semua data permanen?')) {
                clearLocalSyncData();
                window.location.reload();
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <Database size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Manajemen Data</h2>
                    <p className="text-slate-400">Backup dan Restore data aplikasi untuk dipindahkan ke perangkat lain</p>
                </div>
            </div>

            {/* Sinkronisasi Server */}
            <div className="card-glass p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between hover:border-indigo-500/30 transition-colors">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 mt-0.5">
                        <Cloud size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Sinkronisasi Server</h3>
                        <p className="text-slate-400 text-sm">
                            {sync.pendingCount > 0
                                ? `${sync.pendingCount} perubahan belum tersimpan di server. Akan dikirim otomatis saat koneksi stabil.`
                                : 'Semua perubahan sudah tersimpan di server.'}
                        </p>
                        {sync.lastSavedAt && (
                            <p className="text-xs text-slate-500 mt-1">
                                Terakhir tersimpan: {new Date(sync.lastSavedAt).toLocaleTimeString('id-ID')}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={sync.syncNow}
                    disabled={sync.status === 'saving'}
                    className="btn-primary bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                >
                    <RefreshCw size={18} className={sync.status === 'saving' ? 'animate-spin' : ''} />
                    Sinkronkan Sekarang
                </button>
            </div>

            {/* Catatan sinkronisasi (perubahan yang diabaikan / digabung) */}
            {sync.notices.length > 0 && (
                <div className="card-glass p-6 space-y-3 border-amber-500/20">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle size={20} />
                            <h3 className="text-lg font-bold">Catatan Sinkronisasi</h3>
                        </div>
                        <button
                            onClick={sync.clearNotices}
                            className="text-xs font-medium text-slate-400 hover:text-white underline underline-offset-2"
                        >
                            Bersihkan
                        </button>
                    </div>
                    <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {sync.notices.map(n => (
                            <li
                                key={n.id}
                                className={`text-sm rounded-lg border px-3 py-2 ${n.kind === 'merged'
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                    }`}
                            >
                                <p>{n.message}</p>
                                <p className="text-[10px] opacity-60 mt-0.5">
                                    {new Date(n.at).toLocaleString('id-ID')}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Backup Section */}
                <div className="card-glass p-6 space-y-4 hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-3 text-blue-400 mb-2">
                        <Download size={24} />
                        <h3 className="text-lg font-bold">Backup Data</h3>
                    </div>
                    <p className="text-slate-400 text-sm h-10">
                        Download semua data (Nasabah & Transaksi) ke dalam file JSON untuk disimpan atau dipindahkan.
                    </p>
                    <button
                        onClick={handleBackup}
                        className="w-full btn-primary bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        Download Backup
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                        Total {state.transactions.length} transaksi • {state.borrowers.length} nasabah
                    </p>
                </div>

                {/* Restore Section */}
                <div className="card-glass p-6 space-y-4 hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-3 text-emerald-400 mb-2">
                        <Upload size={24} />
                        <h3 className="text-lg font-bold">Restore Data</h3>
                    </div>
                    <p className="text-slate-400 text-sm h-10">
                        Upload file backup JSON untuk mengembalikan data. <span className="text-rose-400">Data saat ini akan ditimpa.</span>
                    </p>
                    <div className="relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleRestore}
                            accept=".json"
                            className="hidden"
                            id="restore-file"
                        />
                        <label
                            htmlFor="restore-file"
                            className="w-full btn-secondary bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 cursor-pointer flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all"
                        >
                            <Upload size={18} />
                            Pilih File Backup
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                        Hanya menerima file .json
                    </p>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-12 p-6 rounded-xl border border-rose-900/50 bg-rose-950/10">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500 mt-1">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-rose-400">Danger Zone</h3>
                        <p className="text-slate-400 text-sm mt-1 mb-4">
                            Tindakan ini akan menghapus seluruh data aplikasi dari browser ini. Lakukan hanya jika Anda ingin memulai dari nol.
                        </p>
                        <button
                            onClick={handleReset}
                            className="text-sm font-medium text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-2 px-2 py-1 rounded hover:bg-rose-500/10 w-fit transition-colors"
                        >
                            <RefreshCw size={14} />
                            Reset Aplikasi ke Awal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
