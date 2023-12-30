const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const createConnection = require("./dbhandler");
const request = require("@hapi/hapi/lib/request");

const register = async (request, h) => {
    try {
        const { username, password } = request.payload;
        const db = await createConnection();

        // Check if username is already registered
        const [usernameRows] = await db.execute("SELECT * FROM login WHERE username = ?", [username]);
        if (usernameRows.length > 0) {
            return h.response({
                status: "Error",
                message: "Username sudah terdaftar, mohon gunakan username yang lain",
                code: 400,
            });
        }

        // Hash the password and insert the user into the database
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute("INSERT INTO login (username, password) VALUES (?, ?)", [username, hashedPassword]);

        return h.response({
            status: "Success",
            message: "Berhasil Register",
            code: 201,
        });
    } catch (error) {
        console.error('Error during registration:', error);
        return h.response({
            status: "Failed",
            message: "Terjadi kesalahan internal saat registrasi.",
            code: 500,
        });
    }
};

const login = async (request, h) => {
    try {
        const { username, password } = request.payload;

        if (!username || !password) {
            return h.response({
                status: "Failed",
                message: "Login gagal. Harap masukkan username dan password.",
                code: 400,
            });
        }

        const db = await createConnection();
        const [rows] = await db.execute("SELECT * FROM login WHERE username = ?", [username]);

        if (rows.length > 0) {
            const isValidPassword = await bcrypt.compare(password, rows[0].password);

            if (isValidPassword) {
                const token = jwt.sign(
                    { username: rows[0].username },
                    "rahasiakunci",
                    { expiresIn: "1h" }
                );

                return h.response({
                    status: "Success",
                    message: "Berhasil Login",
                    code: 200,
                    token: token,
                });
            } else {
                return h.response({
                    status: "Failed",
                    message: "Login gagal. Password salah.",
                    code: 401,
                });
            }
        } else {
            return h.response({
                status: "Failed",
                message: "Login gagal. Pengguna tidak ditemukan.",
                code: 401,
            });
        }
    } catch (error) {
        console.error('Error during login:', error);
        return h.response({
            status: "Failed",
            message: "Terjadi kesalahan internal saat login.",
            code: 500,
        });
    }
};


//handler masuk parkir

const masukparkir = async (request, h) => {
    try {
        const { id, jenis, lantai } = request.payload;

        // Validasi ID
        if (!id) {
            return h.response({
                status: "Error",
                message: "ID kendaraan harus disertakan",
                code: 400,
            });
        }

        // Validasi jenis kendaraan
        if (jenis !== "mobil" && jenis !== "motor") {
            return h.response({
                status: "Error",
                message: "Jenis kendaraan tidak valid",
                code: 400,
            });
        }

        // Validasi jenis lantai
        if (lantai !== "lantai 1" && lantai !== "lantai 2") {
            return h.response({
                status: "Error",
                message: "Jenis lantai tidak valid",
                code: 400,
            });
        }

        const db = await createConnection(); 

        const [rows, fields] = await db.execute(
            "INSERT INTO parkir (id, jenis, lantai, waktu_masuk) VALUES (?, ?, ?, NOW())",
            [id, jenis, lantai]
        );

        return h.response({
            status: "Success",
            message: "Kendaraan berhasil diparkir",
            code: 201,
        });
    } catch (error) {
        console.error('Error during parking:', error);
        return h.response({
            status: "Failed",
            message: "Terjadi kesalahan internal saat parkir.",
            code: 500,
        });
    }
};


const keluarparkir = async (request, h) => {
    try {
        const { id } = request.payload; // Ambil ID kendaraan yang keluar
        const waktuKeluar = new Date(); // Waktu keluar saat ini

        const db = await createConnection();

        // Perbarui waktu keluar pada record kendaraan yang keluar
        await db.execute("UPDATE parkir SET waktu_keluar = ? WHERE id = ?", [waktuKeluar, id]);

        // Ambil data parkir untuk mendapatkan waktu masuk dan jenis kendaraan
        const [rows] = await db.execute("SELECT * FROM parkir WHERE id = ?", [id]);
        const waktuMasuk = new Date(rows[0].waktu_masuk);

        // Hitung selisih waktu masuk dan waktu keluar dalam jam
        const selisihJam = (waktuKeluar - waktuMasuk) / (1000 * 60 * 60);

        // Hitung harga parkir sesuai dengan aturan yang diberikan
        let hargaParkir;
        if (rows[0].jenis === 'mobil') {
            hargaParkir = 5000 + Math.max(0, Math.ceil(selisihJam - 1) * 2000);
        } else if (rows[0].jenis === 'motor') {
            hargaParkir = 3000 + Math.max(0, Math.ceil(selisihJam - 1) * 1000);
        } else {
            return h.response({
                status: "Failed",
                message: "Jenis kendaraan tidak valid",
                code: 400,
            });
        }

        // menambahkan data ke total_pengunjung
        await db.execute("INSERT INTO total_pengunjung (jenis, harga, waktu_masuk, waktu_keluar) VALUES (?, ?, ?, ?)", [rows[0].jenis, hargaParkir, waktuMasuk , waktuKeluar]);

        // menghapus data dari table parkir
        await db.execute("DELETE FROM parkir WHERE id = ?", [id]);

       // jika sudah lebih dari 7 hari data akan terhapus
        const tujuhHariYangLalu = new Date();
        tujuhHariYangLalu.setDate(tujuhHariYangLalu.getDate() - 7);
        await db.execute("DELETE FROM total_pengunjung WHERE waktu_keluar < ?", [tujuhHariYangLalu]);

        return h.response({
            status: "Success",
            message: "Kendaraan berhasil keluar dari parkiran",
            code: 200,
            hargaParkir: hargaParkir,
        });
    } catch (error) {
        console.error('Error during exit:', error);
        return h.response({
            status: "Failed",
            message: "Terjadi kesalahan internal saat kendaraan keluar.",
            code: 500,
        });
    }
};




module.exports = {
    register,
    login,
    masukparkir,
    keluarparkir,
};
