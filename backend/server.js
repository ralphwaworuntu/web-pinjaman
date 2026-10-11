const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Limit besar karena data JSON bisa lumayan besar

// Pool Koneksi MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'web_pinjaman',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Koneksi ke MySQL & Inisialisasi Tabel
async function initDB() {
    try {
        // Test koneksi & Buat tabel 'app_state' jika belum ada
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS app_state (
        configId VARCHAR(50) PRIMARY KEY,
        appData LONGTEXT NOT NULL,
        rev INT NOT NULL DEFAULT 0,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
        await pool.query(createTableQuery);

        // Migrasi: tambahkan kolom 'rev' (nomor revisi) jika tabel lama belum punya
        const [cols] = await pool.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_state' AND COLUMN_NAME = 'rev'`
        );
        if (cols.length === 0) {
            await pool.query('ALTER TABLE app_state ADD COLUMN rev INT NOT NULL DEFAULT 0');
            console.log('✅ Kolom rev ditambahkan ke tabel app_state');
        }

        console.log('✅ MySQL connected and table ready!');
    } catch (err) {
        console.error('❌ MySQL connection error/Table creation error:', err);
    }
}

initDB();

// --- ROUTES API ---

// Cek koneksi ringan (dipakai klien untuk mengetahui server dapat dijangkau)
app.get('/api/health', (req, res) => {
    res.status(200).json({ ok: true });
});

// Cek nomor revisi saja (sangat ringan) - dipakai klien untuk mengetahui apakah
// perangkat lain sudah mengubah data, tanpa mengunduh seluruh data.
app.get('/api/state/rev', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT rev FROM app_state WHERE configId = ?', ['main']);
        res.status(200).json({ rev: rows.length ? rows[0].rev : 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal membaca revisi dari database MySQL' });
    }
});

// 1. Mengambil Data (GET)
//    - /api/state?v=2  -> { rev, data }   (klien baru, dengan nomor revisi)
//    - /api/state      -> data langsung   (klien lama)
app.get('/api/state', async (req, res) => {
    try {
        // Panggil data dengan configId 'main'
        const [rows] = await pool.query('SELECT appData, rev FROM app_state WHERE configId = ?', ['main']);

        const isV2 = req.query.v === '2';

        if (rows.length === 0) {
            // Jika kosong, kirim respon kosong tapi sukses
            return res.status(200).json(isV2 ? { rev: 0, data: null } : null);
        }

        // Parse hasil string LONGTEXT menjadi JSON objek kembali
        const data = JSON.parse(rows[0].appData);
        if (isV2) {
            return res.status(200).json({ rev: rows[0].rev, data });
        }
        res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data dari database MySQL' });
    }
});

// 2. Menyimpan/Memperbarui Data (POST)
//    Protokol baru : body = { baseRev, data }
//       - Hanya disimpan jika baseRev sama dengan revisi di server.
//       - Jika berbeda -> 409 { rev, data } (data terbaru dari server).
//    Protokol lama : body = state langsung (tanpa baseRev) -> menimpa seperti sebelumnya.
app.post('/api/state', async (req, res) => {
    try {
        const body = req.body;
        const isV2 = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'baseRev') && body.data;

        // --- Protokol lama (kompatibel mundur) ---
        if (!isV2) {
            const newDataStr = JSON.stringify(body);
            const query = `
      INSERT INTO app_state (configId, appData, rev)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE appData = ?, rev = rev + 1
    `;
            await pool.query(query, ['main', newDataStr, newDataStr]);
            return res.status(200).json({ message: 'Data berhasil disimpan ke cloud MySQL!' });
        }

        // --- Protokol baru dengan cek revisi ---
        const baseRev = Number(body.baseRev) || 0;
        const newDataStr = JSON.stringify(body.data);

        const [rows] = await pool.query('SELECT rev FROM app_state WHERE configId = ?', ['main']);

        let saved = false;
        let newRev = 0;

        if (rows.length === 0) {
            // Belum ada data di server -> buat baru (INSERT IGNORE agar aman dari balapan)
            const [result] = await pool.query(
                'INSERT IGNORE INTO app_state (configId, appData, rev) VALUES (?, ?, 1)',
                ['main', newDataStr]
            );
            if (result.affectedRows === 1) {
                saved = true;
                newRev = 1;
            }
        } else if (rows[0].rev === baseRev) {
            // Update atomik: hanya berhasil jika revisi belum berubah
            const [result] = await pool.query(
                'UPDATE app_state SET appData = ?, rev = rev + 1 WHERE configId = ? AND rev = ?',
                [newDataStr, 'main', baseRev]
            );
            if (result.affectedRows === 1) {
                saved = true;
                newRev = baseRev + 1;
            }
        }

        if (saved) {
            return res.status(200).json({ message: 'Data berhasil disimpan ke cloud MySQL!', rev: newRev });
        }

        // Konflik: perangkat lain sudah menyimpan lebih dulu. Kirim data terbaru.
        const [latest] = await pool.query('SELECT appData, rev FROM app_state WHERE configId = ?', ['main']);
        const latestData = latest.length ? JSON.parse(latest[0].appData) : null;
        return res.status(409).json({
            error: 'Konflik revisi',
            rev: latest.length ? latest[0].rev : 0,
            data: latestData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menyimpan data ke MySQL' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server Backend berjalan di http://localhost:${PORT}`);
});
