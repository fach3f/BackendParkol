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
    const { username, email, password } = request.payload;
    console.log(username, email, password);

    if (!username && !email) {
      return "Login gagal. Harap masukkan username atau email.";
    }
    if (!password) {
      return "Login gagal. Harap masukkan password.";
    }
  
    const db = await createConnection();
  
    let query = "";
    let queryParams = [];
  
    if (username) {
      query = "SELECT * FROM users WHERE username = ?";
      queryParams = [username];
    } else if (email) {
      query = "SELECT * FROM users WHERE email = ?";
      queryParams = [email];
    }
  
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
        });
      }
    }
  
    return h.response({
      status: "Failed",
      message: "Login gagal. Periksa kembali username, email, dan password Anda.",
      code: 404,
    });
  };

module.exports = {
    register,
    login};