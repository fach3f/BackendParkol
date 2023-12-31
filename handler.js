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

    // handler untuk menampilkan data di database parkir
    const getParkirData = async (request, h) => {
        try {
            const db = await createConnection();
            const [rows] = await db.execute("SELECT * FROM parkir");
            
            return h.response({
                status: "Success",
                message: "Berhasil mendapatkan data parkir",
                code: 200,
                data: rows,
            });
        } catch (error) {
            console.error('Error getting parkir data:', error);
            return h.response({
                status: "Failed",
                message: "Terjadi kesalahan internal saat mendapatkan data parkir.",
                code: 500,
            });
        }
    };

    // handler untuk menampilkan total kendaraan di lantai 1
    const getTotalKendaraanLantai1 = async (request, h) => {
        try {
            const db = await createConnection();
            const [rows] = await db.execute("SELECT COUNT(*) AS total_kendaraan FROM parkir WHERE lantai = 'lantai 1'");
            const [row] = await db.execute("SELECT * FROM parkir WHERE lantai = 'lantai 1'");
            
            return h.response({
                status: "Success",
                message: "Berhasil mendapatkan total kendaraan di lantai 1",
                code: 200,
                totalKendaraan: rows[0].total_kendaraan,
                data: row,
            });
        } catch (error) {
            console.error('Error getting total kendaraan lantai 1:', error);
            return h.response({
                status: "Failed",
                message: "Terjadi kesalahan internal saat mendapatkan total kendaraan lantai 1.",
                code: 500,
            });
        }
    };

    // handler untuk menampilkan total kendaraan di lantai 2
    const getTotalKendaraanLantai2 = async (request, h) => {
        try {
            const db = await createConnection();
            const [rows] = await db.execute("SELECT COUNT(*) AS total_kendaraan FROM parkir WHERE lantai = 'lantai 2'");
            const [row] = await db.execute("SELECT * FROM parkir WHERE lantai = 'lantai 2'");

            return h.response({
                status: "Success",
                message: "Berhasil mendapatkan total kendaraan di lantai 2",
                code: 200,
                totalKendaraan: rows[0].total_kendaraan,
                data: row,
                
            });
        } catch (error) {
            console.error('Error getting total kendaraan lantai 2:', error);
            return h.response({
                status: "Failed",
                message: "Terjadi kesalahan internal saat mendapatkan total kendaraan lantai 2.",
                code: 500,
            });
        }
    };

    const getTotalPengunjungHariSebelumnya = async (request, h) => {
        try {
            const { jenis } = request.params; // Ambil parameter jenis kendaraan dari URL
            const db = await createConnection();

            // Ambil tanggal 1 hari sebelumnya
            const satuHariSebelumnya = new Date();
            satuHariSebelumnya.setDate(satuHariSebelumnya.getDate() - 1);

            // Ambil data total pengunjung untuk jenis dan tanggal tersebut
            const [rows] = await db.execute(
                "SELECT jenis, SUM(harga) AS total_harga FROM total_pengunjung WHERE jenis = ? AND waktu_keluar >= ? AND waktu_keluar < ? GROUP BY jenis",
                [jenis, satuHariSebelumnya, new Date()]
            );

            return h.response({
                status: "Success",
                message: `Berhasil mendapatkan total pengunjung ${jenis} hari sebelumnya`,
                code: 200,
                data: {
                    jenis: jenis,
                    total_harga: rows[0].total_harga,
                    tanggal: satuHariSebelumnya.toISOString().split('T')[0], // Format tanggal sebagai string (YYYY-MM-DD)
                },
            });
        } catch (error) {
            console.error(`Error getting total pengunjung ${jenis} hari sebelumnya:`, error);
            return h.response({
                status: "Failed",
                message: `Terjadi kesalahan internal saat mendapatkan total pengunjung ${jenis} hari sebelumnya.`,
                code: 500,
            });
        }
    };
    const getAllPengunjung = async (request, h) => {
        try {
            const db = await createConnection();

            // Ambil data total pengunjung per hari
            const [rows] = await db.execute(
                "SELECT DATE(waktu_masuk) AS tanggal, SUM(harga) AS total_harga, COUNT(*) AS total_pengunjung FROM total_pengunjung GROUP BY tanggal"
            );

            return h.response({
                status: "Success",
                message: "Berhasil mendapatkan data total pengunjung per hari",
                code: 200,
                data: rows,
            });
        } catch (error) {
            console.error('Error getting all pengunjung per hari data:', error);
            return h.response({
                status: "Failed",
                message: "Terjadi kesalahan internal saat mendapatkan data total pengunjung per hari.",
                code: 500,
            });
        }
    };
    const getTotalPengunjungAverage = async (request, h) => {
        try {
          const db = await createConnection();
      
          const getAverageVisitorsByDaysAgo = async (daysAgo) => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);
      
            // Fetch data for the date range
            const [rows] = await db.execute(
              "SELECT COUNT(DISTINCT id) AS total_unique_visitors FROM total_pengunjung WHERE waktu_keluar >= ? AND waktu_keluar < ? AND waktu_keluar <= NOW()",
              [startDate, new Date()]
            );
      
            const result = {
              [`average_visitors${daysAgo}`]: rows.length > 0 ? Math.floor(rows[0].total_unique_visitors / daysAgo) : 0,
              [`${daysAgo}hariyanglalu`]: startDate.toISOString().split('T')[1].split('.')[0], // Extracting time part
            };
      
            return result;
          };
      
          // Get average visitors for the last 1 day
          const result1 = await getAverageVisitorsByDaysAgo(1);
      
          // Get average visitors for the last 2 days
          const result2 = await getAverageVisitorsByDaysAgo(2);
      
          // Get average visitors for the last 3 days
          const result3 = await getAverageVisitorsByDaysAgo(3);
      
          return h.response({
            status: "Success",
            message: "Berhasil mendapatkan rata-rata pengunjung",
            code: 200,
            data: [result1, result2, result3],
          });
        } catch (error) {
          console.error("Error getting average pengunjung:", error);
          return h.response({
            status: "Failed",
            message: "Terjadi kesalahan internal saat mendapatkan rata-rata pengunjung.",
            code: 500,
          });
        }
      };
      
const getAverageVisitorsByDayOfWeek = async (request, h) => {
  try {
    const db = await createConnection();

    // Fetch average visitors for each day of the week
    const [rows] = await db.execute(
      "SELECT DAYOFWEEK(waktu_keluar) AS day, COUNT(DISTINCT id) AS total_unique_visitors FROM total_pengunjung GROUP BY day"
    );

    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const averageVisitorsByDay = {};

    // Initialize the object with default values
    dayNames.forEach((dayName, index) => {
      averageVisitorsByDay[dayName] = 0;
    });

    // Summing up the total unique visitors for each day
    rows.forEach((row) => {
      const dayName = dayNames[row.day - 1]; // Adjusting index for dayNames array
      averageVisitorsByDay[dayName] = row.total_unique_visitors;
    });

    return h.response({
      status: "Success",
      message: "Berhasil mendapatkan rata-rata pengunjung per hari",
      code: 200,
      data: averageVisitorsByDay,
    });
  } catch (error) {
    console.error("Error getting average pengunjung by day:", error);
    return h.response({
      status: "Failed",
      message: "Terjadi kesalahan internal saat mendapatkan rata-rata pengunjung per hari.",
      code: 500,
    });
  }
};

      
      


    module.exports = {
        register,
        login,
        masukparkir,
        keluarparkir,
        getParkirData,
        getTotalKendaraanLantai1,
        getTotalKendaraanLantai2,
        getTotalPengunjungHariSebelumnya,
        getAllPengunjung,
        getTotalPengunjungAverage,
        getAverageVisitorsByDayOfWeek
    };
