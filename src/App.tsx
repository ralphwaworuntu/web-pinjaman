import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { LayoutDashboard, Users, Calculator, Settings, Menu, X, LogOut, Database, FileText, AlertCircle, CheckSquare } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SetupPanel from './components/SetupPanel';
import BorrowerManager from './components/BorrowerManager';
import LoanForm from './components/LoanForm';
import LoanTable from './components/LoanTable';
import RecapPage from './components/RecapPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DatabaseManager from './components/DatabaseManager';
import MarkAsPaidPage from './components/MarkAsPaidPage';
import SyncStatus from './components/SyncStatus';

type Page = 'landing' | 'login' | 'dashboard';
type Tab = 'dashboard' | 'input' | 'markPaid' | 'borrowers' | 'recap' | 'config' | 'database' | 'arrears';

function App() {
    const { state } = useApp();
    const { isAuthenticated, user, logout } = useAuth();

    // Routing state
    const [page, setPage] = useState<Page>(isAuthenticated ? 'dashboard' : 'landing');
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const closeMobileMenu = () => setMobileMenuOpen(false);

    const handleLogout = () => {
        logout();
        setPage('landing');
        setMobileMenuOpen(false);
    };

    // --- Page Routing ---
    if (page === 'landing' && !isAuthenticated) {
        return <LandingPage onGoToLogin={() => setPage('login')} />;
    }

    if (page === 'login' && !isAuthenticated) {
        return (
            <LoginPage
                onBack={() => setPage('landing')}
                onLoginSuccess={() => setPage('dashboard')}
            />
        );
    }

    // If not authenticated and somehow on dashboard, redirect
    if (!isAuthenticated) {
        return <LandingPage onGoToLogin={() => setPage('login')} />;
    }

    // --- Dashboard (Protected) ---
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div key="dashboard">
                        <Dashboard />
                    </div>
                );
            case 'input':
                return (
                    <div key="input" className="animate-in slide-in-from-bottom-4 duration-500">
                        <LoanForm />
                    </div>
                );
            case 'markPaid':
                return (
                    <div key="markPaid" className="animate-in slide-in-from-bottom-4 duration-500">
                        <MarkAsPaidPage />
                    </div>
                );
            case 'borrowers':
                return (
                    <div key="borrowers" className="animate-in slide-in-from-right-4 duration-500">
                        <BorrowerManager />
                    </div>
                );
            case 'recap':
                return (
                    <div key="recap" className="animate-in fade-in duration-500">
                        <RecapPage />
                    </div>
                );
            case 'config':
                return (
                    <div key="config" className="animate-in zoom-in-95 duration-500">
                        <SetupPanel />
                    </div>
                );
            case 'database':
                return (
                    <div key="database" className="animate-in fade-in duration-500">
                        <DatabaseManager />
                    </div>
                );
            case 'arrears':
                return (
                    <div key="arrears" className="animate-in fade-in duration-500">
                        <LoanTable viewMode="arrears" />
                    </div>
                );
            default:
                return null;
        }
    };

    const theme = state.config.activeCycle === 'Gaji' ? {
        logoBg: 'bg-blue-600',
        logoShadow: 'shadow-blue-500/30',
        navActive: 'bg-blue-500/10 text-blue-400 shadow-sm border border-blue-500/10',
        navIconInfo: 'text-blue-400',
        cycleText: 'text-blue-400',
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    } : {
        logoBg: 'bg-purple-600',
        logoShadow: 'shadow-purple-500/30',
        navActive: 'bg-purple-500/10 text-purple-400 shadow-sm border border-purple-500/10',
        navIconInfo: 'text-purple-400',
        cycleText: 'text-purple-400',
        badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    };

    return (
        <div className="min-h-screen text-slate-100 flex flex-col md:flex-row font-sans selection:bg-blue-500/30">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-slate-950/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${theme.logoBg} ${theme.logoShadow} ring-1 ring-white/10`}>
                        <span className="font-bold text-white text-sm">WP</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">Web Pinjaman</span>
                </div>
                <div className="flex items-center gap-2">
                    <SyncStatus compact />
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="text-slate-300 p-2 hover:bg-white/5 rounded-xl transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Sidebar Overlay for Mobile */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 ${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-slate-950 border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out transform md:sticky md:top-0 md:h-screen ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0 md:shadow-none'}`}>
                {/* Sidebar Header */}
                <div className={`p-6 ${isSidebarCollapsed ? 'px-4' : ''}`}>
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-6 relative`}>
                        <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'hidden' : ''}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${theme.logoBg} ${theme.logoShadow} ring-1 ring-white/10 shrink-0`}>
                                <span className="font-extrabold text-white text-base">WP</span>
                            </div>
                            <div className="overflow-hidden">
                                <h1 className="font-bold text-xl tracking-tight leading-none whitespace-nowrap">Web Pinjaman</h1>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest ml-0.5 whitespace-nowrap">V.4.0 PRO</span>
                            </div>
                        </div>

                        {/* Desktop Collapse Button */}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className={`hidden md:flex text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-all`}
                            aria-label="Toggle sidebar"
                            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <Menu size={20} />
                        </button>

                        {/* Close button — mobile only */}
                        <button
                            onClick={closeMobileMenu}
                            className="md:hidden text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
                            aria-label="Close menu"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* User Profile Card */}
                    <div className={`bg-white/5 p-3 rounded-xl border border-white/5 mb-2 hover:bg-white/10 transition-colors group cursor-default relative ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all bg-gradient-to-br from-slate-700 to-slate-600 shadow-inner group-hover:scale-105 shrink-0`}>
                                {user?.username.charAt(0).toUpperCase()}
                            </div>
                            {!isSidebarCollapsed && (
                                <>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-bold text-slate-200 truncate">{user?.username}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider truncate">{user?.role}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                        title="Logout"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                        {isSidebarCollapsed && (
                            <button onClick={handleLogout} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Logout" />
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-1 px-3 flex-1 overflow-y-auto custom-scrollbar">
                    {isSidebarCollapsed ? <div className="h-px bg-white/10 my-2 mx-2" /> : <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-1">Menu Utama</p>}
                    <NavItem
                        icon={<LayoutDashboard size={18} />}
                        label="Dashboard"
                        isActive={activeTab === 'dashboard'}
                        onClick={() => { setActiveTab('dashboard'); closeMobileMenu(); }}
                        activeClass={theme.navActive}
                        iconClass={theme.navIconInfo}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={<Calculator size={18} />}
                        label="Input Transaksi"
                        isActive={activeTab === 'input'}
                        onClick={() => { setActiveTab('input'); closeMobileMenu(); }}
                        activeClass={theme.navActive}
                        iconClass={theme.navIconInfo}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={<CheckSquare size={18} />}
                        label="Tandai Lunas"
                        isActive={activeTab === 'markPaid'}
                        onClick={() => { setActiveTab('markPaid'); closeMobileMenu(); }}
                        activeClass={theme.navActive}
                        iconClass={theme.navIconInfo}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={<AlertCircle size={18} />}
                        label="Data Tunggakan"
                        isActive={activeTab === 'arrears'}
                        onClick={() => { setActiveTab('arrears'); closeMobileMenu(); }}
                        activeClass={theme.navActive}
                        iconClass={theme.navIconInfo}
                        isCollapsed={isSidebarCollapsed}
                    />

                    {isSidebarCollapsed ? <div className="h-px bg-white/10 my-2 mx-2" /> : <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-6">Database</p>}
                    <NavItem
                        icon={<Users size={18} />}
                        label="Database Peminjam"
                        isActive={activeTab === 'borrowers'}
                        onClick={() => { setActiveTab('borrowers'); closeMobileMenu(); }}
                        activeClass={theme.navActive}
                        iconClass={theme.navIconInfo}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={<FileText size={18} />}
                        label="Rekapan Laporan"
                        isActive={activeTab === 'recap'}
                        onClick={() => { setActiveTab('recap'); closeMobileMenu(); }}
                        activeClass={theme.navActive}
                        iconClass={theme.navIconInfo}
                        isCollapsed={isSidebarCollapsed}
                    />

                    {isSidebarCollapsed ? <div className="h-px bg-white/10 my-2 mx-2" /> : <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-6">System</p>}
                    <NavItem
                        icon={<Settings size={18} />}
                        label="Konfigurasi"
                        isActive={activeTab === 'config'}
                        onClick={() => { setActiveTab('config'); closeMobileMenu(); }}
                        activeClass={theme.navActive}
                        iconClass={theme.navIconInfo}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={<Database size={18} />}
                        label="Data & Backup"
                        isActive={activeTab === 'database'}
                        onClick={() => { setActiveTab('database'); closeMobileMenu(); }}
                        activeClass={theme.navActive}
                        iconClass={theme.navIconInfo}
                        isCollapsed={isSidebarCollapsed}
                    />
                </nav>

                {/* Sidebar Footer */}
                {!isSidebarCollapsed && (
                    <div className="p-4 border-t border-white/5 space-y-3 bg-slate-950/50">
                        {/* Cycle Status */}
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Siklus Aktif</p>
                                <SyncStatus compact />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-bold transition-colors duration-300 ${theme.cycleText}`}>
                                    {state.config.activeCycle} ({state.config.activeCycle === 'Gaji' ? state.config.activeMonthGaji : state.config.activeMonthRemon})
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-10 overflow-y-auto min-h-[calc(100vh-64px)] md:min-h-screen w-full relative">
                {/* Subtle top light effect */}
                <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none -z-10" />

                <header className="flex flex-col items-center text-center gap-4 mb-10">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white uppercase">
                            {activeTab === 'dashboard' && 'Dashboard Overview'}
                            {activeTab === 'arrears' && 'Manajemen Tunggakan'}
                            {activeTab === 'input' && 'Input Transaksi Baru'}
                            {activeTab === 'markPaid' && 'Tandai Lunas Cepat'}
                            {activeTab === 'borrowers' && 'Database Peminjam'}
                            {activeTab === 'recap' && 'Rekapan Laporan'}
                            {activeTab === 'config' && 'Konfigurasi Sistem'}
                            {activeTab === 'database' && 'Data & Backup'}
                        </h2>
                        <p className="text-slate-400 text-base mt-2 max-w-2xl leading-relaxed mx-auto">
                            {activeTab === 'dashboard' && 'Ringkasan performa portofolio dan aktivitas pinjaman bulan ini.'}
                            {activeTab === 'arrears' && 'Pantau dan kelola penagihan pinjaman yang melewati jatuh tempo.'}
                            {activeTab === 'input' && 'Form pencatatan pinjaman baru dengan kalkulasi bunga otomatis.'}
                            {activeTab === 'markPaid' && 'Tandai pinjaman aktif sebagai lunas dengan mudah dan cepat.'}
                            {activeTab === 'borrowers' && 'Kelola data lengkap nasabah dan limit kredit mereka.'}
                            {activeTab === 'recap' && 'Analisis mendalam mengenai profitabilitas dan arus kas.'}
                            {activeTab === 'config' && 'Sesuaikan parameter aplikasi, bunga, dan siklus penagihan.'}
                            {activeTab === 'database' && 'Manajemen keamanan data, backup, dan pemulihan sistem.'}
                        </p>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <SyncStatus />
                        <div className={`bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 text-sm font-bold shadow-lg transition-colors duration-500 flex items-center gap-2 ${theme.cycleText}`}>
                            <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
                            {state.config.activeCycle === 'Gaji' ? state.config.activeMonthGaji : state.config.activeMonthRemon}
                        </div>
                    </div>
                </header>

                {renderContent()}
            </main>
        </div>
    );
}

function NavItem({ icon, label, isActive, onClick, activeClass, iconClass, isCollapsed }: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    activeClass: string;
    iconClass: string;
    isCollapsed?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            title={isCollapsed ? label : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 group w-full ${isCollapsed ? '' : 'text-left'} font-medium text-sm ${isActive
                ? `${activeClass}`
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
        >
            <div className={`transition-colors duration-200 shrink-0 ${isActive ? iconClass : 'text-slate-500 group-hover:text-slate-300'}`}>
                {icon}
            </div>
            {!isCollapsed && <span className="truncate">{label}</span>}
        </button>
    );
}

export default App;
