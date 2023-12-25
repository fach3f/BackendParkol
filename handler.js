const register = async (request, h) => {
    const { username, email, password } = request.payload;
  
    const db = await createConnection();
  
    const [usernameRows] = await db.execute(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
  
    if (usernameRows.length > 0) {
      return h.response({
        status: "Error",
        message: "Username sudah terdaftar, mohon gunakan username yang lain",
        code: 400,
      });
    }
  
    const [emailRows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
  
    if (emailRows.length > 0) {
      return h.response({
        status: "Error",
        message: "Email sudah terdaftar",
        code: 400,
      });
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const [rows, fields] = await db.execute(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );
  
    return h.response({
      status: "Success",
      message: "Data berhasil ditambahkan",
      code: 201,
    });
  };
  
  // Handler Login
  
  const login = async (request, h) => {
    const { username, password } = request.payload;
  
    if (!username) {
      return h.response({
        status: "Failed",
        message: "Login gagal. Harap masukkan username.",
        code: 400,
      });
    }
  
    if (!password) {
      return h.response({
        status: "Failed",
        message: "Login gagal. Harap masukkan password.",
        code: 400,
      });
    }
  
    const db = await createConnection();
  
    const query = "SELECT * FROM users WHERE username = ?";
    const queryParams = [username];
  
    const [rows, fields] = await db.execute(query, queryParams);
  
    if (rows.length > 0) {
      const isValidPassword = await bcrypt.compare(password, rows[0].password);
  
      if (isValidPassword) {
        const token = jwt.sign(
          { username: rows[0].username, email: rows[0].email },
          "rahasiakunci",
          { expiresIn: "1h" }
        );
  
        return h.response({
          status: "Success",
          message: "Berhasil Login",
          code: 200,
          token: token, // Include the token in the response
        });
      }
    }
  
    return h.response({
      status: "Failed",
      message: "Login gagal. Periksa kembali username dan password Anda.",
      code: 401,
    });
  };
  
  module.exports = {
    register,
    login,
  };
