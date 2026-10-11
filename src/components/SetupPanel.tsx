import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Settings, Calendar, Percent, UploadCloud, Link, X, Lock, Key, ShieldCheck, AlertCircle } from 'lucide-react';
import MonthYearSelect from './MonthYearSelect';
import { MONTH_NAMES, joinMonth, monthsOfYear, sortMonthList, yearsOf } from '../utils/month';

export default function SetupPanel() {
    const { state, dispatch } = useApp();
    const { config } = state;
    const { user, updateCredentials } = useAuth();

    // Credentials change state
    const [oldPassword, setOldPassword] = useState('');
    const [newUsername, setNewUsername] = useState(user?.username || 'admin');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Tambah bulan baru: pilihan Bulan dan Tahun terpisah
    const [newMonthName, setNewMonthName] = useState<string>(MONTH_NAMES[new Date().getMonth()]);
    const [newMonthYear, setNewMonthYear] = useState<string>(new Date().getFullYear().toString());

    const sortedAvailableMonths = sortMonthList(config.availableMonths || []);
    const availableYears = yearsOf(sortedAvailableMonths); // terbaru di atas

    const handleCredentialsChange = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess(false);

        if (!oldPassword) {
            setPasswordError('Password lama harus diisi untuk konfirmasi!');
            return;
        }

        if (!newUsername.trim()) {
            setPasswordError('Username baru tidak boleh kosong!');
            return;
        }

        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                setPasswordError('Password baru dan konfirmasi tidak cocok!');
                return;
            }

            if (newPassword.length < 3) {
                setPasswordError('Password baru minimal 3 karakter!');
                return;
            }
        }

        const result = updateCredentials(oldPassword, newUsername.trim(), newPassword);

        if (result.success) {
            setPasswordSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordSuccess(false), 3000);
        } else {
            setPasswordError(result.error || 'Terjadi kesalahan');
        }
    };

    return (
        <div className="card-glass p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Settings size={24} />
                </div>
                <h3 className="text-xl font-bold">Pengaturan Sistem</h3>
            </div>

            <div className="space-y-8">
                {/* Cycle Selection */}
                <div className="space-y-3">
                    <label className="text-slate-400 text-sm font-medium">Siklus Aktif Dashboard</label>
                    <div className="segmented-control">
                        <button
                            onClick={() => dispatch({ type: 'UPDATE_CONFIG', payload: { activeCycle: 'Gaji' } })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${config.activeCycle === 'Gaji'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                        >
                            Gaji (Tgl 1)
                        </button>
                        <button
                            onClick={() => dispatch({ type: 'UPDATE_CONFIG', payload: { activeCycle: 'Remon' } })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${config.activeCycle === 'Remon'
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                        >
                            Remon
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Gaji Settings */}
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-900/5 space-y-4">
                        <h4 className="font-bold text-blue-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            Pengaturan Siklus Gaji
                        </h4>

                        <div className="space-y-2">
                            <label className="text-slate-400 text-xs uppercase font-bold">Bulan Aktif</label>
                            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 p-2 rounded-lg">
                                <Calendar size={18} className="text-blue-500 ml-2" />
                                <MonthYearSelect
                                    months={sortedAvailableMonths}
                                    value={config.activeMonthGaji}
                                    onChange={(v) => dispatch({ type: 'UPDATE_CONFIG', payload: { activeMonthGaji: v } })}
                                    className="w-full"
                                    selectClassName="w-full appearance-none bg-transparent border-none focus:ring-0 text-slate-200 text-sm font-medium pl-2 pr-7 py-1.5 cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-slate-400 text-xs uppercase font-bold">Bunga Default</label>
                            <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-700 p-3 rounded-lg">
                                <Percent size={20} className="text-blue-500" />
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="rateGaji"
                                            checked={config.interestRateGaji === 10}
                                            onChange={() => dispatch({ type: 'UPDATE_CONFIG', payload: { interestRateGaji: 10 } })}
                                            className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2"
                                        />
                                        <span className="text-slate-200">10%</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="rateGaji"
                                            checked={config.interestRateGaji === 20}
                                            onChange={() => dispatch({ type: 'UPDATE_CONFIG', payload: { interestRateGaji: 20 } })}
                                            className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2"
                                        />
                                        <span className="text-slate-200">20%</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Remon Settings */}
                    <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-900/5 space-y-4">
                        <h4 className="font-bold text-purple-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            Pengaturan Siklus Remon
                        </h4>

                        <div className="space-y-2">
                            <label className="text-slate-400 text-xs uppercase font-bold">Bulan Aktif</label>
                            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 p-2 rounded-lg">
                                <Calendar size={18} className="text-purple-500 ml-2" />
                                <MonthYearSelect
                                    months={sortedAvailableMonths}
                                    value={config.activeMonthRemon}
                                    onChange={(v) => dispatch({ type: 'UPDATE_CONFIG', payload: { activeMonthRemon: v } })}
                                    className="w-full"
                                    selectClassName="w-full appearance-none bg-transparent border-none focus:ring-0 text-slate-200 text-sm font-medium pl-2 pr-7 py-1.5 cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-slate-400 text-xs uppercase font-bold">Bunga Default</label>
                            <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-700 p-3 rounded-lg">
                                <Percent size={20} className="text-purple-500" />
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="rateRemon"
                                            checked={config.interestRateRemon === 10}
                                            onChange={() => dispatch({ type: 'UPDATE_CONFIG', payload: { interestRateRemon: 10 } })}
                                            className="w-4 h-4 text-purple-500 bg-slate-800 border-slate-600 focus:ring-purple-500 focus:ring-2"
                                        />
                                        <span className="text-slate-200">10%</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="rateRemon"
                                            checked={config.interestRateRemon === 20}
                                            onChange={() => dispatch({ type: 'UPDATE_CONFIG', payload: { interestRateRemon: 20 } })}
                                            className="w-4 h-4 text-purple-500 bg-slate-800 border-slate-600 focus:ring-purple-500 focus:ring-2"
                                        />
                                        <span className="text-slate-200">20%</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Google Sheets Sync Settings */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-900/5 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                            <UploadCloud size={20} />
                            Google Sheets Sync (Backup)
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.enableAutoSync || false}
                                onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { enableAutoSync: e.target.checked } })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            <span className="ml-3 text-sm font-medium text-slate-300">Auto Sync</span>
                        </label>
                    </div>

                    <div className="space-y-2">
                        <label className="text-slate-400 text-xs uppercase font-bold">Google Apps Script Web App URL</label>
                        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 p-2 rounded-lg">
                            <Link size={18} className="text-emerald-500 ml-2 shrink-0" />
                            <input
                                type="text"
                                placeholder="https://script.google.com/macros/s/..."
                                value={config.googleScriptUrl || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'UPDATE_CONFIG', payload: { googleScriptUrl: e.target.value } })}
                                className="bg-transparent border-none focus:ring-0 text-slate-200 w-full text-sm font-medium"
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Masukkan URL Web App dari Google Apps Script untuk sinkronisasi otomatis.
                        </p>
                    </div>
                </div>

                {/* Data Master: Month Management */}
                <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/30 space-y-4">
                    <h4 className="font-bold text-slate-300 flex items-center gap-2">
                        <Calendar size={20} className="text-slate-400" />
                        Manajemen Daftar Bulan
                    </h4>
                    <p className="text-xs text-slate-500">Tambahkan bulan baru ke dalam daftar agar bisa dipilih sebagai bulan aktif.</p>

                    <div className="grid grid-cols-[1fr_6rem_auto] gap-2">
                        <select
                            aria-label="Bulan"
                            value={newMonthName}
                            onChange={(e) => setNewMonthName(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer [&>option]:bg-slate-900"
                        >
                            {MONTH_NAMES.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <input
                            aria-label="Tahun"
                            type="number"
                            min={2000}
                            max={2100}
                            value={newMonthYear}
                            onChange={(e) => setNewMonthYear(e.target.value)}
                            placeholder="Tahun"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={() => {
                                if (!/^\d{4}$/.test(newMonthYear)) {
                                    alert('Tahun harus 4 angka, contoh: 2026');
                                    return;
                                }
                                const val = joinMonth(newMonthName, newMonthYear);

                                const currentMonths = config.availableMonths || [];
                                if (currentMonths.includes(val)) {
                                    alert('Bulan sudah ada!');
                                    return;
                                }

                                dispatch({
                                    type: 'UPDATE_CONFIG',
                                    payload: { availableMonths: sortMonthList([...currentMonths, val]) }
                                });
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        >
                            Tambah
                        </button>
                    </div>

                    {/* Quick Add Year Button */}
                    <div className="flex items-center gap-2 justify-end mt-2 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-xs text-slate-400">Tahun:</span>
                            <input
                                type="number"
                                defaultValue={new Date().getFullYear()}
                                id="yearInput"
                                className="bg-transparent w-16 text-sm text-white focus:outline-none border-none p-0 appearance-none"
                            />
                        </div>
                        <button
                            onClick={() => {
                                const yearInput = document.getElementById('yearInput') as HTMLInputElement;
                                const year = yearInput.value;
                                if (!year) return;

                                const newMonths = MONTH_NAMES.map(m => joinMonth(m, year));
                                const currentMonths = config.availableMonths || [];

                                // Merge, dedup, dan urutkan kronologis
                                const sortedMonths = sortMonthList(Array.from(new Set([...currentMonths, ...newMonths])));

                                dispatch({
                                    type: 'UPDATE_CONFIG',
                                    payload: { availableMonths: sortedMonths }
                                });
                                alert(`Bulan untuk tahun ${year} berhasil ditambahkan dan diurutkan!`);
                            }}
                            className="text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 border border-blue-600/30 px-3 py-1.5 rounded-lg transition-all"
                        >
                            + Generate Full Tahun
                        </button>
                    </div>

                    <div className="space-y-3 mt-2">
                      {availableYears.map(year => (
                        <div key={year} className="flex flex-col sm:flex-row sm:items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider sm:w-14 sm:pt-1.5 shrink-0">{year}</span>
                          <div className="flex flex-wrap gap-2">
                        {monthsOfYear(sortedAvailableMonths, year).map(monthName => {
                            const m = joinMonth(monthName, year);
                            return (
                            <div key={m} className="pl-3 pr-1 py-1 bg-slate-900 rounded-full border border-slate-700 text-xs text-slate-300 flex items-center gap-1 group hover:border-slate-500 transition-colors">
                                {monthName}
                                <button
                                    onClick={() => {
                                        if (m === config.activeMonthGaji || m === config.activeMonthRemon) {
                                            alert(`Tidak dapat menghapus bulan ${m} karena sedang aktif digunakan!`);
                                            return;
                                        }
                                        if (window.confirm(`Hapus ${m} dari daftar?`)) {
                                            const newMonths = (config.availableMonths || []).filter(month => month !== m);
                                            dispatch({
                                                type: 'UPDATE_CONFIG',
                                                payload: { availableMonths: newMonths }
                                            });
                                        }
                                    }}
                                    className="p-1 hover:bg-rose-500 hover:text-white rounded-full text-slate-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Hapus Bulan"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            );
                        })}
                          </div>
                        </div>
                      ))}
                    </div>
                </div>

                {/* Security Settings: Change Credentials */}
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-900/5 space-y-4">
                    <h4 className="font-bold text-rose-400 flex items-center gap-2">
                        <ShieldCheck size={20} />
                        Pengaturan Akses & Keamanan
                    </h4>
                    <p className="text-xs text-slate-500">Ganti username atau password akses Administrator. Password lama wajib diisi.</p>

                    <form onSubmit={handleCredentialsChange} className="space-y-3 mt-2">
                        {passwordError && (
                            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-2 rounded flex items-center gap-2">
                                <AlertCircle size={14} />
                                <span>{passwordError}</span>
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-2 rounded flex items-center gap-2">
                                <ShieldCheck size={14} />
                                <span>Kredensial berhasil diperbarui!</span>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-slate-400 text-xs uppercase font-bold">Username Baru</label>
                                <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 px-3 py-2 rounded-lg focus-within:border-emerald-500/50 transition-colors">
                                    <ShieldCheck size={16} className="text-emerald-500" />
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value)}
                                        className="bg-transparent border-none focus:ring-0 text-slate-200 w-full text-sm"
                                        placeholder="Username"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-slate-400 text-xs uppercase font-bold mt-1 md:mt-0">Password Lama (Wajib)</label>
                                <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 px-3 py-2 rounded-lg focus-within:border-rose-500/50 transition-colors">
                                    <Lock size={16} className="text-rose-400" />
                                    <input
                                        type="password"
                                        value={oldPassword}
                                        onChange={e => setOldPassword(e.target.value)}
                                        className="bg-transparent border-none focus:ring-0 text-slate-200 w-full text-sm"
                                        placeholder="Masukkan password lama"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-slate-400 text-xs uppercase font-bold">Password Baru (Opsional)</label>
                                <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 px-3 py-2 rounded-lg focus-within:border-blue-500/50 transition-colors">
                                    <Key size={16} className="text-blue-500" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="bg-transparent border-none focus:ring-0 text-slate-200 w-full text-sm"
                                        placeholder="Kosongkan jika tidak diubah"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-slate-400 text-xs uppercase font-bold">Konfirmasi Password Baru</label>
                                <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 px-3 py-2 rounded-lg focus-within:border-blue-500/50 transition-colors">
                                    <Key size={16} className="text-slate-500" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="bg-transparent border-none focus:ring-0 text-slate-200 w-full text-sm"
                                        placeholder="Ulangi password baru"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
                            >
                                <Lock size={16} />
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
