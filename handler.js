const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const createConnection = require("./dbhandler");

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
            }
        }

        return h.response({
            status: "Failed",
            message: "Login gagal. Periksa kembali username dan password Anda.",
            code: 401,
        });
    } catch (error) {
        console.error('Error during login:', error);
        return h.response({
            status: "Failed",
            message: "Terjadi kesalahan internal saat login.",
            code: 500,
        });
    }
};

module.exports = {
    register,
    login,
};
