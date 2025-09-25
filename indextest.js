const express = require("express");

const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { register } = require("module");
const { resolve } = require("path");
const { rejects } = require("assert");
const { error, log } = require("console");
const { emit } = require("process");

const app = express();
port = 3000;

const db = mysql.createConnection({
  host: "202.28.34.203",
  port: 3306,
  user: "mb68_66011212249",
  password: "O+Wjs1sL88ch",
  database: "mb68_66011212249",
});

const ACCESS_TOKEN_SECRET = "abcdefg";
REFRESH_TOKEN_SECRET = "aabbccddeeffgg";
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("MySql connectd...");
});

function queryDatabase(sql, params) {
  return new Promise((resolve, rejects) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        resolve({
          error: err,
          data: [],
        });
      }
      resolve({
        error: "",
        data: result,
      });
    });
  });
}

app.use(bodyParser.json());

app.get("/", (req, res) => {
  console.log("client test defaul path");
  res.send("Hello");
});

app.post("/user/register", async (req, res) => {
  try {
    console.log(req.body.email);
    console.log(req.body.name);
    console.log(req.body.password);
    console.log(req.body.wallet);

    const { name, email, password, wallet } = req.body;

    if (!name || name.length < 3) {
      res.send({
        status: "error",
        message: `ชื่อต้องมีความยาวอย่างน้อย 3 ตัวอักษร (คุณกรอกมา ${
          name ? name.length : 0
        } ตัว)`,
      });
      return;
    }
    if (!email || email.length < 4) {
      res.send({
        status: "error",
        message: `อีเมลต้องมีความยาวอย่างน้อย 4 ตัวอักษร (คุณกรอกมา ${
          email ? email.length : 0
        } ตัว)`,
      });
      return;
    }
    if (!password || password.length < 3) {
      res.send({
        status: "error",
        message: `รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร (คุณกรอกมา ${
          password ? password.length : 0
        } ตัว)`,
      });
      return;
    }

    let sqlStr = "SELECT email FROM users WHERE email=?";
    let result = await queryDatabase(sqlStr, [email]);
    if (result.data && result.data.length > 0) {
      res.send({
        status: "error",
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
      return;
    }

      let sqlStruser = "SELECT username FROM users WHERE username=?";
    let resultuser = await queryDatabase(sqlStruser, [name]);
    if (resultuser.data && resultuser.data.length > 0) {
      res.send({
        status: "error",
        message: "ชื่อนี้ถูกใช้งานแล้ว",
      });
      return;
    }


    

    //hash pwd
    const hashPassword = bcrypt.hashSync(password, 8);
    //console.log(hasfPassword);
    sqlStr =
      "INSERT into users (username, email,password,wallet)VALUES(?,?,?,?)";
    result = await queryDatabase(sqlStr, [name, email, hashPassword, wallet]);
    if (result["error"] != "") {
      console.log(result.error);

      res.send({
        status: "error",
        message: result["error"].sqlMessage || "Database error",
      });
      return;
    }

    res.send({
      status: "success",
      message: "สมัครสมาชิกสำเร็จ",
    });
  } catch (error) {
    res.send({
      status: "error",
      message: error.message,
    });
    return;
  }
});




app.post("/user/login", async (req, res) => {
  const { email, password } = req.body;
  let emailOrUsername = email;
  if (!emailOrUsername || emailOrUsername.length == 0) {
    return res.send({
      status: "error",
      message: "Email or username is invalid",
    });
  }

  if (!password || password.length == 0) {
    return res.send({
      status: "error",
      message: "Password is invalid",
    });
  }

  if (!emailOrUsername || emailOrUsername.length == 0) {
    res.send({
      status: "error",
      message: "Email or username is invalid",
    });
    return;
  }
  if (!password || password.length == 0) {
    res.send({
      status: "error",
      message: "Password is invid",
    });
    return;
  }

  let sqlStr = "SELECT * FROM users WHERE email=? or username=?";
  let result = await queryDatabase(sqlStr, [emailOrUsername, emailOrUsername]);
  let user = result.data[0];

  if (!result.data || result.data.length === 0) {
    return res.send({
      status: "error",
      message: "อีเมลหรือชื่อผู้ใช้ผิด",
    });
  }
  const passwordIsVaild = bcrypt.compareSync(password, user.password);
  if (!passwordIsVaild) {
    res.send({
      status: "error",
      message: "รหัสผ่านไม่ถูกต้อง",
    });
    return;
  } else {
    const accessToken = jwt.sign(
      { id: user.email, role: user.role },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: "10h",
      }
    );

    const refreshToken = jwt.sign(
      { id: user.email, role: user.role },
      REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.send({
  status: "success",
  message: "",
  data: {
    accessToken: accessToken,
    refreshToken: refreshToken,
    role: user.role,
    username: user.username,   // ส่งชื่อ
    userid: user.user_id,  
    wallet: user.wallet,       // ส่ง wallet
    email: user.email,       // ส่ง email
  },
});
    console.log("Logged in user_id:", user.user_id); // ✅ แก้ตรงนี้


    return;
  }
});

app.post("/user/refreshtoken", async (req, res) => {
  const { refreshTokentoken } = req.body;
  if (refreshTokentoken == null || refreshTokentoken.length == 0) {
    res.send({
      status: "error",
      message: "อีเมลหรือชื่อผู้ใช้ผิด",
      data: { accessToken: null, expiresToken: true },
    });
    return;
  }
  try {
    jwt.verify(refreshTokentoken, REFRESH_TOKEN_SECRET, (err, user) => {
      if (err)
        return res.status(403).send({
          status: "error",
          message: "Invild or Expired Refresh Token",
        });

      const accessToken = jwt.sign({ id: user.id }, ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({
        status: "success",
        message: "",
        data: { accessToken: accessToken, expiresToken: false },
      });
      return;
    });
  } catch (error) {
    res.status(500).send({
      status: "error",
      message: "server error",
      data: [],
    });
    return;
  }
});

function authencationToken(req, res, next) {
  let token = req.headers["authorization"];
  console.log(token);
  if (!token) {
    res.status(401).send({
      status: "error",
      message: "Access token invild",
      data: {
        AccessTokenCorrect: false,
      },
    });
    return;
  }
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }
  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      res.status(403).send({
        status: "error",
        message: "Access token is expired",
        data: {
          AccessTokenCorrect: false,
        },
      });
      return;
    }
    req.user = user;
    next();
  });
}

app.get("/user/:email", authencationToken, async (req, res) => {
  const { email } = req.params;

  let sqlStr =
    "SELECT user_id, username, email, wallet FROM users WHERE email=?";
  let resultData = await queryDatabase(sqlStr, [email]);
  if (resultData.data[0]) {
    res.send({
      status: "success",
      message: "",
      data: resultData.data[0],
    });
    return;
  } else {
    res.send({
      status: "error",
      message: "not found email",
      data: [],
    });
    return;
  }
});

// Logout endpoint
app.post("/user/logout", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || refreshToken.length === 0) {
    return res.status(400).send({
      status: "error",
      message: "Refresh Token is required",
    });
  }

  res.send({
    status: "success",
    message: "Logged out successfully",
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



//keen

// API สำหรับดึงรางวัลตามวันที่
app.post("/lotto/prize", async (req, res) => {
  try {
    const { drawdate } = req.body; // "2025-09-20"
    
    if (!drawdate) {
      return res.status(400).send({
        status: "error",
        message: "กรุณาส่ง drawdate ด้วย",
      });
    }
        
    const sqlStr = `
      SELECT ln.number, wn.prize_amount, wn.prize_rank
      FROM winning_numbers wn
      JOIN lotto_numbers ln ON wn.lotto_id = ln.lotto_id
      WHERE DATE(ln.draw_date) = ?
      ORDER BY wn.prize_rank ASC
    `;

    const result = await queryDatabase(sqlStr, [drawdate]);

    if (!result.data || result.data.length === 0) {
      return res.send({
        status: "success",
        message: "ไม่พบผลรางวัลสำหรับวันที่นี้",
        data: [],
      });
    }
        
    res.send({
      status: "success",
      message: "",
      data: result.data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
});













// API สำหรับตรวจสอบรางวัล
app.post("/lotto/checkprize", async (req, res) => {
  try {
    const { number, drawdate, username } = req.body;
        
    log("ส่งมา number = " + number + " drawdate = " + drawdate + " username = " + username);
    
    if (!number || !drawdate || !username) {
      return res.status(400).json({ 
        status: "error", 
        message: "ข้อมูลไม่ครบ" 
      });
    }

    // ตรวจสอบว่าผู้ใช้มีสลากนี้หรือไม่ (ในงวดที่ระบุ)
    const purchaseSql = `
      SELECT 
        p.purchase_id,
        ln.lotto_id,
        ln.number,
        p.status
      FROM purchases p
      JOIN users u ON p.user_id = u.user_id
      JOIN lotto_numbers ln ON p.lotto_id = ln.lotto_id
      WHERE u.username = ? 
        AND ln.number like ?
        AND DATE(ln.draw_date) like ?
        AND p.status = 'purchased'
      LIMIT 1
    `;
    const purchaseResult = await queryDatabase(purchaseSql, [username, number, drawdate]);

    if (!purchaseResult.data || purchaseResult.data.length === 0) {
      return res.send({
        status: "error",
        message: "ไม่พบสลากใบนี้ในงวดที่ระบุ",
        data: [],
      });
    }

    const lottoId = purchaseResult.data[0].lotto_id;
    log(lottoId.toString());



    

    // ตรวจสอบว่าถูกรางวัลหรือไม่
    const winningSql = `
      SELECT lotto_id, prize_rank, prize_amount
      FROM winning_numbers
      WHERE lotto_id = ? `;
    const winningResult = await queryDatabase(winningSql, [lottoId]);

    if (!winningResult.data || winningResult.data.length === 0) {
        // console.log("ยังไม่ได้ถูกรางวัล", lottoId);

      return res.send({
        status: "success",
        message: "ยังไม่ได้ถูกรางวัล",
        data: [], 
      });
    }

    // ถูกรางวัล - ส่งข้อมูลรางวัลกลับไป
    // const prizeData = winningResult.data.map((item) => ({
    //   number: purchaseResult.data[0].number,
    //   prizeRank: item.prize_rank,
    //   prizeAmount: item.prize_amount,
    // }));
   console.log("ยินดีด้วย ", lottoId);
    return res.send({
      
      status: "success",
      message: "ยินดีด้วย! ถูกรางวัล",
      data: winningResult.data,
    });
  } catch (error) {
    console.log("catch error");
    console.error("Error in checkprize:", error);
    res.status(500).send({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
});














//////////
app.get("/lotto-admin-sold", authencationToken, async (req, res) => {
  try {
    const { type } = req.query;
    let sqlStr;
    let params = [];

    if (type === "sold") {
      sqlStr = `
       SELECT DISTINCT
  l.lotto_id,
  l.number AS lotto_number,
  l.price,
  l.status AS purchase_status,
  w.prize_rank,
  DATE_FORMAT(l.draw_date, '%Y-%m-%d') AS draw_date
FROM lotto_numbers l
LEFT JOIN winning_numbers w ON l.lotto_id = w.lotto_id
WHERE l.status = 'sold'
ORDER BY l.lotto_id DESC

      `;
    } else if (type === "available") {
      sqlStr = `
        SELECT
          l.lotto_id,
          l.number AS lotto_number,
          l.price,
          'available' AS purchase_status,
          NULL AS prize_rank,
          DATE_FORMAT(l.draw_date, '%Y-%m-%d') AS draw_date
        FROM lotto_numbers l
        LEFT JOIN purchases p ON l.lotto_id = p.lotto_id
        WHERE p.lotto_id IS NULL
        ORDER BY l.lotto_id
      `;
    } else {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุ type=sold หรือ type=available ใน query string",
      });
    }

    const result = await queryDatabase(sqlStr, params);
    console.log(result.data);
    res.json({
      status: "success",
      message: "",
      data: result.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: err.message,
      data: [],
    });
  }
});




//สร้างใบล้อตโต้เพื่อขาย
app.post("/admin/generate-lotto-batch", authencationToken, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res
        .status(403)
        .json({ status: "error", message: "Access denied" });
    }

    let { count } = req.body;
    count = parseInt(count, 10) || 100;

   
    const existing = await queryDatabase(
      "SELECT number FROM lotto_numbers",
      []
    );
    const existingNumbers = new Set(existing.data.map((r) => r.number));
    const lottoNumbers = [];

    while (lottoNumbers.length < count) {
      const number = Math.floor(100000 + Math.random() * 900000).toString();
      if (!existingNumbers.has(number) && !lottoNumbers.includes(number)) {
        lottoNumbers.push(number);
      }
    }
    console.log("Generated lotto numbers:", lottoNumbers);
    const insertValues = lottoNumbers.map((num) => [num, new Date()]);
    const insertSql = "INSERT INTO lotto_numbers (number, draw_date) VALUES ?";
    const insertResult = await new Promise((resolve, reject) => {
      db.query(insertSql, [insertValues], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    const ids = Array.from(
      { length: lottoNumbers.length },
      (_, i) => i + insertResult.insertId
    );
    const placeholders = ids.map(() => "?").join(",");
    const querySql = `
      SELECT
        lotto_id,
        number AS lotto_number,
        price,
        status AS purchase_status,
        draw_date
      FROM lotto_numbers
      WHERE lotto_id IN (${placeholders})
      ORDER BY lotto_id DESC
    `;
    const lottoData = await queryDatabase(querySql, ids);
    console.log(lottoData.data);

    res.json({
      status: "success",
      message: `สร้างล็อตโต้สำเร็จ ${lottoNumbers.length} ใบ`,
      data: lottoData.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});








//รีเซทดาต้าเบสจริง
app.post("/reset", authencationToken, async (req, res) => {
  try {
    const adminUsername = "admin1";

    // ลบข้อมูลทุกตาราง
    await db.promise().query("DELETE FROM winning_numbers");
    await db.promise().query("DELETE FROM purchases");
    await db.promise().query("DELETE FROM lotto_numbers");
    await db
      .promise()
      .query("DELETE FROM users WHERE username <> ?", [adminUsername]);

    // รีเซ็ต Auto Increment
    await db
      .promise()
      .query("ALTER TABLE lotto_numbers AUTO_INCREMENT = 1");
    await db.promise().query("ALTER TABLE purchases AUTO_INCREMENT = 1");
    await db
      .promise()
      .query("ALTER TABLE winning_numbers AUTO_INCREMENT = 1");

    res.json({
      status: "success",
      message: "ระบบรีเซ็ตเรียบร้อย เหลือเพียงผู้ดูแลระบบของคุณเท่านั้น",
    });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});






// API สุ่มลอตโต้
app.post("/lotto/draw", async (req, res) => {
  try {
    const { fromSold } = req.body;

    let sql = "";
    if (fromSold) {
      sql = "SELECT number FROM lotto_numbers WHERE status='sold'";
    } else {
      sql = "SELECT number FROM lotto_numbers";
    }

    const result = await queryDatabase(sql); // queryDatabase คืน { error, data }
    if (result.error) {
      return res.send({ status: "error", message: result.error.sqlMessage || "Database error" });
    }

    const numbers = result.data; // numbers ต้องใช้ result.data

    if (!numbers || numbers.length === 0) {
      return res.send({ status: "error", message: "ไม่มีเลขลอตเตอรี่สำหรับสุ่ม" });
    }

    // สุ่มรางวัล 1-3
    const shuffled = numbers.sort(() => 0.5 - Math.random());
    const prizeNumbers = shuffled.slice(0, 3).map((row) => row.number ?? "000000");
    const [prize1, prize2, prize3] = prizeNumbers;

    // รางวัล 4 = เลขท้าย 3 ตัวของ prize1
    const prize4 = (prize1 ?? "000000").slice(-3);

    // รางวัล 5 = สุ่มเลขท้าย 2 ตัวจากเลขทั้งหมด
    const allNums = numbers.map((row) => row.number ?? "00");
    const randomNumber = allNums[Math.floor(Math.random() * allNums.length)];
    const prize5 = (randomNumber ?? "00").slice(-2);

    res.send({
      status: "success",
      data: { prize1, prize2, prize3, prize4, prize5 },
    });
  } catch (error) {
    res.send({ status: "error", message: error.message });
  }
});

/////////////////////////////////////////////////////////////////////
function queryDatabaseStrict(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}




app.post("/lotto/save", async (req, res) => {
  console.log("body received:", req.body);
  const { draw_date, prizes } = req.body;
console.log("วันที่: " + draw_date.toString());
   
  if (!prizes || Object.keys(prizes).length === 0) {
    return res.send({ status: "error", message: "ข้อมูลรางวัลไม่ครบ" });
  }

  try {
    await queryDatabaseStrict("START TRANSACTION");

    for (const rank of Object.keys(prizes)) {
      const prizeRank = parseInt(rank, 10); // แปลงเป็น INT
      const prizeNumber = prizes[rank].number.toString().padStart(6, "0");
      const prizeAmount = prizes[rank].amount;

      // ตรวจสอบเลขนี้ใน lotto_numbers
      let rows = await queryDatabaseStrict(
        "SELECT lotto_id FROM lotto_numbers WHERE number = ?",
        [prizeNumber]
      );

      let lottoId;
      if (rows.length === 0) {
        // ถ้าไม่มี → insert ใหม่
        const insertResult = await queryDatabaseStrict(
          "INSERT INTO lotto_numbers (number, status, draw_date) VALUES (?, ?, ?)",
          [prizeNumber, "available", draw_date]
        );
        lottoId = insertResult.insertId;
      } else {
        // ถ้ามีแล้ว → update draw_date
        lottoId = rows[0].lotto_id;
        await queryDatabaseStrict(
          "UPDATE lotto_numbers SET draw_date = ? WHERE lotto_id = ?",
          [draw_date, lottoId]
        );
      }

      // บันทึกผลรางวัล
      await queryDatabaseStrict(
        `INSERT INTO winning_numbers (lotto_id, prize_rank, prize_amount)
         VALUES (?, ?, ?)`,
        [lottoId, prizeRank, prizeAmount]
      );
    }

    await queryDatabaseStrict("COMMIT");
    res.send({ status: "success", message: "บันทึกผลรางวัลเรียบร้อย" });
  } catch (error) {
    await queryDatabaseStrict("ROLLBACK").catch(() => {});
    res.send({ status: "error", message: error.message });
  }
});


//////////////////////////////////////ot/////////////////////////////////////







app.get("/lotto", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT lotto_id, number, price, draw_date FROM lotto_numbers WHERE status = 'available'`
    );
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});















// ---------------- GET PURCHASE HISTORY ----------------
app.get("/api/purchases/:user_id", authencationToken, async (req, res) => {
  console.log("===== GET PURCHASE HISTORY START =====");

  const tokenUserId = req.user.id;
  const paramUserId = parseInt(req.params.user_id, 10);

  console.log("Token user id:", tokenUserId);
  console.log("Param user id:", paramUserId);

  if (isNaN(paramUserId)) {
    console.warn("Invalid user_id parameter");
    return res.status(400).json({ success: false, message: "Invalid user_id parameter" });
  }
const paramEmail = req.params.email;

 if (tokenUserId !== paramEmail) {
  return res.status(403).json({ success: false, message: "Forbidden: email mismatch" });
}

  try {
    console.log("Querying database for purchase history...");

    const rows = await query(
      `SELECT p.purchase_id, p.user_id, p.lotto_id, l.number AS lotto_number, l.price AS lotto_price,
              l.draw_date, p.purchase_date, p.status, p.cashout_date
       FROM purchases p
       JOIN lotto_numbers l ON p.lotto_id = l.lotto_id
       WHERE p.user_id = ?
       ORDER BY p.purchase_date DESC`,
      [paramUserId]
    );

    console.log("Database query successful. Rows fetched:", rows.length);
    // ถ้าอยากดู detail ทั้งหมด uncomment ด้านล่าง
    // console.log(rows);

    res.json({ success: true, purchases: rows });
    console.log("Response sent successfully.");
  } catch (err) {
    console.error("Error fetching purchase history:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ" });
  }

  console.log("===== GET PURCHASE HISTORY END =====");
});



























// ---------------- CREATE PURCHASE (เลือกหวย) ----------------
app.post("/api/purchases", authencationToken, async (req, res) => {
  try {
    const { user_id, lotto_id } = req.body;
    if (!user_id || !lotto_id) {
      return res.status(400).json({ success: false, message: "Missing user_id or lotto_id" });
    }

    // ตรวจว่าหวยยัง available อยู่ไหม
    const [lotto] = await db.promise().query(
      "SELECT * FROM lotto_numbers WHERE lotto_id=? AND status='available'",
      [lotto_id]
    );
    if (!lotto || lotto.length === 0) {
      return res.status(400).json({ success: false, message: "หวยนี้ถูกเลือกแล้วหรือไม่พร้อมขาย" });
    }

    // insert purchase
    const [result] = await db.promise().query(
      "INSERT INTO purchases (user_id, lotto_id, status, purchase_date) VALUES (?, ?, 'pending', NOW())",
      [user_id, lotto_id]
    );

    res.json({ success: true, purchase_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});






// ---------------- GET CART (เฉพาะ pending) ----------------
app.get("/api/cart", authencationToken, async (req, res) => {
  console.log("=== GET /api/cart called ===");
  try {
    console.log("req.query:", req.query);

    // ใช้ email จาก token แทน numeric userId
    const email = req.user.id;
    console.log("Authenticated user email:", email);

    // เตรียม SQL
    const sql = `
      SELECT p.purchase_id, l.lotto_id, l.number, l.price, l.draw_date
      FROM purchases p
      JOIN lotto_numbers l ON p.lotto_id = l.lotto_id
      JOIN users u ON p.user_id = u.user_id
      WHERE u.email=? AND p.status='pending'
    `;
    console.log("SQL Query:", sql);

    // เรียก database
    const [rows] = await db.promise().query(sql, [email]);
    console.log("SQL result:", rows, "length:", rows.length);

    // ส่ง response
    console.log("Rows to send:", rows);
    res.json(rows);
    console.log("Response sent successfully");

  } catch (err) {
    console.error("Error in /api/cart:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// ---------------- CANCEL PURCHASE ----------------
app.patch("/api/purchases/:id/cancel", authencationToken, async (req, res) => {
  console.log("=== PATCH /api/purchases/:id/cancel called ===");
  try {
    const purchaseId = parseInt(req.params.id, 10);
    console.log("purchaseId:", purchaseId);
    if (!purchaseId) return res.status(400).json({ success: false, message: "Missing purchase_id" });

    const email = req.user.id;
    console.log("Authenticated user email:", email);

    // หา purchase พร้อม user
    const [pRows] = await db.promise().query(
      `SELECT p.*, u.email 
       FROM purchases p 
       JOIN users u ON p.user_id = u.user_id
       WHERE p.purchase_id=?`, 
      [purchaseId]
    );
    console.log("Purchase query result:", pRows);

    if (pRows.length === 0) return res.status(404).json({ success: false, message: "ไม่พบ purchase" });

    const purchase = pRows[0];

    // ตรวจสิทธิ์ด้วย email
    if (purchase.email !== email) {
      console.log("User email mismatch:", purchase.email, "!=", email);
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (purchase.status !== "pending") {
      console.log("Purchase status is not pending:", purchase.status);
      return res.status(400).json({ success: false, message: "ยกเลิกได้เฉพาะ pending" });
    }

    // update purchase → cancelled
    await db.promise().query(
      "UPDATE purchases SET status='cancelled' WHERE purchase_id=?",
      [purchaseId]
    );
    console.log("Purchase updated to cancelled");

    // คืนหวยให้ available
    await db.promise().query(
      "UPDATE lotto_numbers SET status='available' WHERE lotto_id=?",
      [purchase.lotto_id]
    );
    console.log("Lotto number set to available:", purchase.lotto_id);

    res.json({ success: true, message: "ยกเลิกรายการแล้ว" });
    console.log("Response sent successfully");

  } catch (err) {
    console.error("Error in /api/purchases/:id/cancel:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});





app.post("/api/checkout", authencationToken, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: "Missing user_id" });

    // ใช้ email จาก token แทน user_id (ถ้า token เป็น email)
    const email = req.user.id;

    // ดึง pending ของ user (join กับ users เพื่อใช้ email)
    const [items] = await db.promise().query(
      `SELECT p.purchase_id, l.lotto_id, l.price 
       FROM purchases p
       JOIN lotto_numbers l ON p.lotto_id = l.lotto_id
       JOIN users u ON p.user_id = u.user_id
       WHERE u.email=? AND p.status='pending'`,
      [email]
    );
    if (items.length === 0) {
      return res.json({ success: false, message: "ไม่มีหวยในตะกร้า" });
    }

    const total = items.reduce((sum, it) => sum + parseFloat(it.price), 0);

    // ตรวจ wallet
    const [uRows] = await db.promise().query("SELECT wallet FROM users WHERE email=?", [email]);
    const wallet = parseFloat(uRows[0].wallet);
    if (wallet < total) {
      return res.json({ success: false, message: "ยอดเงินไม่พอ", wallet_before: wallet });
    }

    const walletAfter = wallet - total;

    // update wallet
    await db.promise().query("UPDATE users SET wallet=? WHERE email=?", [walletAfter, email]);

    // update purchases → purchased
    await db.promise().query(
      "UPDATE purchases p JOIN users u ON p.user_id = u.user_id SET p.status='purchased', p.cashout_date=NOW() WHERE u.email=? AND p.status='pending'",
      [email]
    );

    // update lotto_numbers → sold
    const lottoIds = items.map((i) => i.lotto_id);
    if (lottoIds.length > 0) {
      await db.promise().query(`UPDATE lotto_numbers SET status='sold' WHERE lotto_id IN (?)`, [lottoIds]);
    }

    res.json({
      success: true,
      total,
      wallet_before: wallet,
      wallet_after: walletAfter,
      message: "ชำระเงินสำเร็จ",
    });

  } catch (err) {
    console.error("Error in /api/checkout:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

