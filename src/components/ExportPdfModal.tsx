import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { X, FileDown, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../utils/loanCalculator';
import MonthYearSelect from './MonthYearSelect';

interface ExportPdfModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ExportPdfModal({ isOpen, onClose }: ExportPdfModalProps) {
    const { state } = useApp();
    const { showToast } = useToast();

    // Default to active month of Gaji or Remon
    const defaultMonth = state.config.activeCycle === 'Gaji' ? state.config.activeMonthGaji : state.config.activeMonthRemon;

    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [categories, setCategories] = useState<{ Gaji: boolean; Remon: boolean }>({
        Gaji: true,
        Remon: true
    });
    const [priorityOnly, setPriorityOnly] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Lock background scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!isOpen) return null;

    const handleGeneratePdf = () => {
        setIsGenerating(true);
        try {
            // 1. Filter Data
            const filteredTransactions = state.transactions.filter(t => {
                // Filter by Month (dueMonth)
                // Note: dueMonth might be undefined in old data, fallback to checking createdAt? 
                // Better to rely on dueMonth as per V3 logic.
                // If dueMonth is missing, maybe checking if it's in the active cycle?
                // For now, strict match or if transaction has no dueMonth, maybe exclude or include?
                // Let's assume dueMonth is populated for V4 data.
                const monthMatch = t.dueMonth === selectedMonth;

                // Filter by Category
                const categoryMatch = (t.category === 'Gaji' && categories.Gaji) || (t.category === 'Remon' && categories.Remon);

                // Filter by Priority
                const priorityMatch = priorityOnly ? t.isPriority : true;

                // Only Active/Lunas? Usually reports include everything for that month?
                // User said "daftar transaksi bulan...".
                // Let's include everything (Lunas, Belum Lunas, Cicil).

                return monthMatch && categoryMatch && priorityMatch;
            });

            if (filteredTransactions.length === 0) {
                showToast('Tidak ada data yang sesuai filter', 'warning');
                setIsGenerating(false);
                return;
            }

            // 2. Sort Data
            // Sort by Name, then maybe Priority?
            filteredTransactions.sort((a, b) => a.borrowerName.localeCompare(b.borrowerName));

            // 3. Generate PDF
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4

            // Header
            doc.setFontSize(18);
            doc.text('Laporan Pinjaman', 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Periode: ${selectedMonth}`, 14, 30);

            // Sub-header stats
            const totalPinjaman = filteredTransactions.reduce((sum, t) => sum + t.totalPrincipal, 0);
            const totalTagihan = filteredTransactions.reduce((sum, t) => sum + t.totalDue, 0);
            const totalSisa = filteredTransactions.reduce((sum, t) => sum + (t.totalDue - t.paidAmount), 0);
            const totalProfit = totalTagihan - totalPinjaman;

            doc.setFontSize(10);
            doc.text(`Total Pinjaman: ${formatCurrency(totalPinjaman)}`, 200, 22, { align: 'right' });
            doc.text(`Total Profit: ${formatCurrency(totalProfit)}`, 200, 28, { align: 'right' });

            doc.setFont("helvetica", "bold");
            doc.text(`Total yang Harus Dibayar: ${formatCurrency(totalSisa)}`, 200, 34, { align: 'right' });
            doc.setFont("helvetica", "normal");

            // Table Columns
            const tableColumn = ["No", "Nama", "Kategori", "Status", "Pinjaman", "Bunga", "Total Tagihan", "Terbayar", "Sisa"];
            const tableRows: (string | number)[][] = [];

            filteredTransactions.forEach((t, index) => {
                const sisa = t.totalDue - t.paidAmount;
                const bunga = t.totalDue - t.totalPrincipal;

                const rowData = [
                    index + 1,
                    t.isPriority ? `${t.borrowerName} (P)` : t.borrowerName,
                    t.category,
                    t.status,
                    formatCurrency(t.totalPrincipal),
                    formatCurrency(bunga),
                    formatCurrency(t.totalDue),
                    formatCurrency(t.paidAmount),
                    formatCurrency(sisa),
                ];
                tableRows.push(rowData);
            });

            // Generate Table
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 40,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                didParseCell: (data) => {
                    // Highlight Priority rows?
                    // Difficult to map back to original data easily in didParseCell without index.
                    // But we can check content of "Nama" column if it has "(P)"?
                    if (data.section === 'body' && data.column.index === 1) {
                        const rawValue = data.cell.raw;
                        if (rawValue && rawValue.toString().includes('(P)')) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.textColor = [255, 152, 0]; // Orange for priority
                        }
                    }
                }
            });

            // Footer
            // Internal type definition fix for getNumberOfPages if needed, or just cast to any
            const pageCount = (doc.internal as any).getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, doc.internal.pageSize.height - 10);
                doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
            }

            doc.save(`Laporan_Pinjaman_${selectedMonth.replace(/\s/g, '_')}.pdf`);
            showToast('PDF berhasil dibuat', 'success');
            onClose();

        } catch (error) {
            console.error('PDF Generation Error:', error);
            showToast('Gagal membuat PDF', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // Use createPortal to render the modal outside the parent hierarchy (dropdown)
    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="card-glass w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 md:p-8 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                            <FileDown size={28} className="text-rose-400 md:w-8 md:h-8" />
                            Export Laporan PDF
                        </h3>
                        <p className="text-slate-400 text-xs md:text-sm mt-1">Download laporan transaksi dalam format PDF siap cetak.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-full"
                    >
                        <X size={24} className="md:w-7 md:h-7" />
                    </button>
                </div>

                <div className="p-8 md:p-10 space-y-8 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Month Selection - Spans 5 columns */}
                        <div className="lg:col-span-5 space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Pilih Periode
                            </label>
                            <div className="relative group">
                                <MonthYearSelect
                                    months={state.config.availableMonths || []}
                                    value={selectedMonth}
                                    onChange={setSelectedMonth}
                                    selectClassName="w-full bg-slate-950/50 border border-slate-600 rounded-xl pl-4 pr-9 py-3.5 text-base font-medium text-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 appearance-none cursor-pointer hover:border-slate-500 transition-all shadow-lg [&>option]:bg-slate-900"
                                />
                            </div>
                        </div>

                        {/* Priority Toggle - Spans 7 columns */}
                        <div className="lg:col-span-7 space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Filter Khusus
                            </label>
                            <label className="flex items-center justify-between cursor-pointer group bg-slate-950/50 border border-slate-600 rounded-xl px-5 py-3.5 hover:border-slate-500 transition-all h-[54px] shadow-lg">
                                <span className="text-base font-medium text-slate-200 flex items-center gap-3">
                                    Hanya Nasabah Prioritas
                                    {priorityOnly && <span className="text-amber-400 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold tracking-wide">AKTIF</span>}
                                </span>
                                <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${priorityOnly ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${priorityOnly ? 'translate-x-6' : 'translate-x-0'}`} />
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={priorityOnly}
                                        onChange={(e) => setPriorityOnly(e.target.checked)}
                                    />
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Kategori Transaksi
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <label className={`flex items-center gap-4 cursor-pointer group p-5 rounded-2xl border transition-all shadow-lg hover:-translate-y-1 ${categories.Gaji
                                ? 'bg-blue-600/10 border-blue-500/50 shadow-blue-500/10'
                                : 'bg-slate-950/50 border-slate-700 hover:border-slate-600'
                                }`}>
                                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${categories.Gaji
                                    ? 'bg-blue-600 border-blue-500'
                                    : 'border-slate-600 group-hover:border-blue-500'
                                    }`}>
                                    {categories.Gaji && <Check size={20} className="text-white" />}
                                </div>
                                <div>
                                    <span className={`block font-bold text-lg mb-0.5 ${categories.Gaji ? 'text-blue-400' : 'text-slate-300'}`}>Potong Gaji</span>
                                    <span className="text-xs text-slate-500">Pinjaman reguler</span>
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={categories.Gaji}
                                    onChange={(e) => setCategories({ ...categories, Gaji: e.target.checked })}
                                />
                            </label>

                            <label className={`flex items-center gap-4 cursor-pointer group p-5 rounded-2xl border transition-all shadow-lg hover:-translate-y-1 ${categories.Remon
                                ? 'bg-purple-600/10 border-purple-500/50 shadow-purple-500/10'
                                : 'bg-slate-950/50 border-slate-700 hover:border-slate-600'
                                }`}>
                                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${categories.Remon
                                    ? 'bg-purple-600 border-purple-500'
                                    : 'border-slate-600 group-hover:border-purple-500'
                                    }`}>
                                    {categories.Remon && <Check size={20} className="text-white" />}
                                </div>
                                <div>
                                    <span className={`block font-bold text-lg mb-0.5 ${categories.Remon ? 'text-purple-400' : 'text-slate-300'}`}>Remon</span>
                                    <span className="text-xs text-slate-500">Pinjaman khusus</span>
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={categories.Remon}
                                    onChange={(e) => setCategories({ ...categories, Remon: e.target.checked })}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-700/50">
                        <button
                            onClick={handleGeneratePdf}
                            disabled={isGenerating || (!categories.Gaji && !categories.Remon)}
                            className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-lg font-bold rounded-xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {isGenerating ? (
                                <span className="animate-pulse flex items-center gap-3">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sedang Memproses PDF...
                                </span>
                            ) : (
                                <>
                                    <FileDown size={24} />
                                    Download Laporan PDF
                                </>
                            )}
                        </button>
                        <p className="text-center text-slate-500 text-xs mt-4">
                            Laporan akan di-generate dalam format PDF Landscape (A4)
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
