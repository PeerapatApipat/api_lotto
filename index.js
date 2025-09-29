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

var os = require("os");
var ip = "0.0.0.0";
var ips = os.networkInterfaces();
Object.keys(ips).forEach(function (_interface) {
  ips[_interface].forEach(function (_dev) {
    if (_dev.family === "IPv4" && !_dev.internal) ip = _dev.address;
  });
});

// =============== DATABASE CONNECTION POOL - OPTIMIZED ===============
const db = mysql.createPool({
  host: "202.28.34.203",
  port: 3306,
  user: "mb68_66011212249",
  password: "O+Wjs1sL88ch",
  database: "mb68_66011212249",
  timezone: 'Z',
  connectionLimit: 20,        // เพิ่มจาก 10 -> 20
  queueLimit: 0,              // ไม่จำกัด queue
  acquireTimeout: 30000,
  timeout: 30000,
  waitForConnections: true,   // รอ connection ว่างแทนที่จะ error
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4'
});

// สร้าง promise wrapper สำหรับใช้ async/await
const promisePool = db.promise();

const ACCESS_TOKEN_SECRET = "abcdefg";
REFRESH_TOKEN_SECRET = "aabbccddeeffgg";

// =============== TEST CONNECTION ===============
promisePool.query("SELECT 1")
  .then(() => {
    console.log("✅ Database connected successfully!");
  })
  .catch((err) => {
    console.error("❌ Database test error:", err);
  });

// =============== HELPER FUNCTION - FIXED ===============
function queryDatabase(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        reject(err); // ⚠️ แก้จาก resolve เป็น reject
      } else {
        resolve({
          error: "",
          data: result,
        });
      }
    });
  });
}

// =============== MIDDLEWARE ===============
app.use(bodyParser.json());

// เพิ่ม request timeout
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 วินาที
  res.setTimeout(30000);
  next();
});

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
    if (!password || password.length < 4) {
      res.send({
        status: "error",
        message: `รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร (คุณกรอกมา ${
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
        username: user.username,
        userid: user.user_id,
        wallet: user.wallet,
        email: user.email,
      },
    });
    console.log("Logged in user_id:", user.user_id);

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

//keen

// API สำหรับดึงรางวัลตามวันที่
app.post("/lotto/prize", async (req, res) => {
  try {
    const { drawdate } = req.body;
    log(drawdate);
    if (!drawdate) {
      return res.status(400).send({
        status: "error",
        message: "กรุณาส่ง drawdate ด้วย",
      });
    }

    const sqlStr = `
      SELECT ln.number, wn.prize_amount, wn.prize_rank, wn.lotto_id
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
        AND DATE(ln.draw_date) = ?
        AND p.status = 'purchased'
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
      SELECT ln.number, wn.prize_amount, wn.prize_rank ,wn.lotto_id
      FROM winning_numbers wn JOIN lotto_numbers ln ON wn.lotto_id = ln.lotto_id
      WHERE wn.lotto_id = ? and ln.status = 'sold'
    `;

    const winningResult = await queryDatabase(winningSql, [lottoId]);

    if (!winningResult.data || winningResult.data.length === 0) {
      return res.send({
        status: "success",
        message: "ยังไม่ได้ถูกรางวัล",
        data: [],
      });
    }

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
        SELECT 
          l.lotto_id,
          l.number AS lotto_number,
          l.price,
          l.status AS purchase_status,
          MAX(w.prize_rank) AS prize_rank,
          DATE_FORMAT(l.draw_date, '%Y-%m-%d') AS draw_date
        FROM lotto_numbers l
        LEFT JOIN winning_numbers w ON l.lotto_id = w.lotto_id
        WHERE l.status = 'sold'
        GROUP BY l.lotto_id, l.number, l.price, l.status, l.draw_date
        ORDER BY l.lotto_id DESC;
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
    const insertValues = lottoNumbers.map((num) => [num]);
    const insertSql = "INSERT INTO lotto_numbers (number) VALUES ?";
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

    await db.promise().query("DELETE FROM winning_numbers");
    await db.promise().query("DELETE FROM purchases");
    await db.promise().query("DELETE FROM lotto_numbers");
    await db
      .promise()
      .query("DELETE FROM users WHERE username <> ?", [adminUsername]);

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

    const result = await queryDatabase(sql);
    if (result.error) {
      return res.send({ status: "error", message: result.error.sqlMessage || "Database error" });
    }

    const numbers = result.data;

    if (!numbers || numbers.length === 0) {
      return res.send({ status: "error", message: "ไม่มีเลขลอตเตอรี่สำหรับสุ่ม" });
    }

    const shuffled = numbers.sort(() => 0.5 - Math.random());
    const prizeNumbers = shuffled.slice(0, 3).map((row) => row.number ?? "000000");
    const [prize1, prize2, prize3] = prizeNumbers;

    const prize4 = (prize1 ?? "000000").slice(-3);

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
      const prizeRank = parseInt(rank, 10);
      const prizeNumber = prizes[rank].number.toString().padStart(6, "0");
      const prizeAmount = prizes[rank].amount;

      const rows = await queryDatabaseStrict(
        `SELECT lotto_id FROM lotto_numbers 
         WHERE number = ? OR RIGHT(number,3) = RIGHT(?,3) OR RIGHT(number,2) = RIGHT(?,2)
         LIMIT 1`,
        [prizeNumber, prizeNumber, prizeNumber]
      );

      if (rows.length === 0) {
        await queryDatabaseStrict("ROLLBACK").catch(() => {});
        return res.send({
          status: "error",
          message: `เลข ${prizeNumber} ไม่พบในระบบ`,
        });
      }

      const lottoId = rows[0].lotto_id;

      await queryDatabaseStrict(
        "UPDATE lotto_numbers SET draw_date = ? WHERE lotto_id = ?",
        [draw_date, lottoId]
      );

      const existingPrize = await queryDatabaseStrict(
        "SELECT id FROM winning_numbers WHERE lotto_id = ? AND prize_rank = ?",
        [lottoId, prizeRank]
      );

      if (existingPrize.length === 0) {
        await queryDatabaseStrict(
          `INSERT INTO winning_numbers (lotto_id, prize_rank, prize_amount)
           VALUES (?, ?, ?)`,
          [lottoId, prizeRank, prizeAmount]
        );
      } else {
        await queryDatabaseStrict(
          "UPDATE winning_numbers SET prize_amount = ? WHERE lotto_id = ? AND prize_rank = ?",
          [prizeAmount, lottoId, prizeRank]
        );
      }
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
      `SELECT lotto_id, number, price, draw_date FROM lotto_numbers WHERE status = 'available' 
      and draw_date is null`
    );
    res.json({ success: true, data: rows || [] });
    console.log("Lotto rows:", rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- GET PURCHASE HISTORY ----------------
app.get("/api/purchases/:user_id", authencationToken, async (req, res) => {
  console.log("===== GET PURCHASE HISTORY START =====");

  const tokenUserId = req.user.id;
  const paramUserId = parseInt(req.params.user_id, 10);

  if (isNaN(paramUserId)) {
    return res.status(400).json({ success: false, message: "Invalid user_id parameter" });
  }

  if (tokenUserId !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden: user_id mismatch" });
  }

  try {
    const sql = `
      SELECT 
        p.purchase_id,
        p.user_id,
        p.lotto_id,
        l.number AS lotto_number,
        l.price AS lotto_price,
        l.draw_date,
        l.status AS lotto_status,
        p.purchase_date,
        p.status AS purchase_status,
        p.cashout_date,
        w.prize_rank,
        w.prize_amount
      FROM purchases p
      JOIN lotto_numbers l ON p.lotto_id = l.lotto_id
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN winning_numbers w ON l.lotto_id = w.lotto_id
      WHERE u.email = ?
      AND  p.status = 'purchased'
      ORDER BY p.purchase_date DESC, w.prize_rank ASC;
    `;

    const [rows] = await db.promise().query(sql, [tokenUserId]);

    const purchasesMap = new Map();

    for (const row of rows) {
      const lottoId = row.lotto_id;
      if (!purchasesMap.has(lottoId)) {
        purchasesMap.set(lottoId, {
          ...row,
          prizes: [],
        });
      }

      if (row.prize_rank) {
        purchasesMap.get(lottoId).prizes.push({
          prize_rank: row.prize_rank,
          prize_amount: row.prize_amount,
          lotto_status: row.lotto_status,
        });
      }
    }

    const groupedPurchases = Array.from(purchasesMap.values());

    res.json({ success: true, purchases: groupedPurchases });
    console.log("Response sent successfully.");
  } catch (err) {
    console.error("Error fetching purchase history:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ" });
  }

  console.log("===== GET PURCHASE HISTORY END =====");
});

/////////////////////CREATE PURCHASE (เลือกหวย) - FIXED
app.post("/api/purchases", authencationToken, async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { lotto_id } = req.body;
    if (!lotto_id) {
      return res.status(400).json({ success: false, message: "Missing lotto_id" });
    }

    await connection.beginTransaction();

    const [u] = await connection.query("SELECT user_id FROM users WHERE email=?", [req.user.id]);
    if (u.length === 0) {
      await connection.rollback();
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }
    const user_id = u[0].user_id;

    const [lrows] = await connection.query(
      "SELECT lotto_id FROM lotto_numbers WHERE lotto_id=? AND status='available' FOR UPDATE",
      [lotto_id]
    );
    if (lrows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "หวยนี้ถูกเลือก/ขายไปแล้ว" });
    }

    await connection.query("UPDATE lotto_numbers SET status='in_cart' WHERE lotto_id=?", [lotto_id]);

    const [pres] = await connection.query(
      "INSERT INTO purchases (user_id, lotto_id, status, purchase_date) VALUES (?, ?, 'pending', NOW())",
      [user_id, lotto_id]
    );

    await connection.commit();
    return res.json({ success: true, data: { purchase_id: pres.insertId } });

  } catch (err) {
    try { await connection.rollback(); } catch (_) {}
    console.error("POST /api/purchases error:", {
      code: err.code, errno: err.errno, sqlState: err.sqlState, message: err.message
    });
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release(); // ⚠️ สำคัญมาก! ต้อง release connection
  }
});

///////////////////GET CART (เฉพาะ pending)
app.get("/api/cart", authencationToken, async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT p.purchase_id, l.lotto_id, l.number, l.price, l.draw_date
       FROM purchases p
       JOIN lotto_numbers l ON p.lotto_id = l.lotto_id
       JOIN users u ON p.user_id = u.user_id
       WHERE u.email=? AND p.status='pending' AND l.status='in_cart'
       ORDER BY p.purchase_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

////////// CANCEL PURCHASE - FIXED
app.patch("/api/purchases/:id/cancel", authencationToken, async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const pid = Number(req.params.id) || 0;
    if (!pid) return res.status(400).json({ success: false, message: "Missing purchase_id" });

    await connection.beginTransaction();

    const [u] = await connection.query("SELECT user_id FROM users WHERE email=?", [req.user.id]);
    if (u.length === 0) { 
      await connection.rollback(); 
      return res.status(401).json({ success:false, message:"Unauthorized" }); 
    }
    const user_id = u[0].user_id;

    const [prows] = await connection.query(
      `SELECT p.purchase_id, p.user_id, p.lotto_id, p.status
       FROM purchases p
       WHERE p.purchase_id=? AND p.user_id=? FOR UPDATE`,
      [pid, user_id]
    );
    if (prows.length === 0) { 
      await connection.rollback(); 
      return res.status(404).json({ success:false, message:"ไม่พบรายการของคุณ" }); 
    }
    if (prows[0].status !== 'pending') { 
      await connection.rollback(); 
      return res.status(400).json({ success:false, message:"ยกเลิกได้เฉพาะ pending" }); 
    }

    await connection.query("UPDATE purchases SET status='cancelled' WHERE purchase_id=?", [pid]);
    await connection.query("UPDATE lotto_numbers SET status='available' WHERE lotto_id=?", [prows[0].lotto_id]);

    await connection.commit();
    res.json({ success: true, message: "ยกเลิกสำเร็จ" });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release(); // ⚠️ สำคัญมาก!
  }
});

// CHECKOUT - FIXED
app.post("/api/checkout", authencationToken, async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const [urows] = await connection.query(
      "SELECT user_id, wallet FROM users WHERE email=? FOR UPDATE",
      [req.user.id]
    );
    if (urows.length === 0) {
      await connection.rollback();
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user_id = urows[0].user_id;
    const walletBefore = Number(urows[0].wallet ?? 0);

    const [cart] = await connection.query(
      `SELECT p.purchase_id, p.lotto_id, l.price
       FROM purchases p
       JOIN lotto_numbers l ON p.lotto_id = l.lotto_id
       WHERE p.user_id=? AND p.status='pending' AND l.status='in_cart'
       FOR UPDATE`,
      [user_id]
    );

    if (cart.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "ไม่มีรายการในตะกร้า" });
    }

    const purchaseIds = cart.map(r => r.purchase_id);
    const lottoIds = cart.map(r => r.lotto_id);
    const total = cart.reduce((sum, r) => sum + Number(r.price ?? 0), 0);

    if (walletBefore < total) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "ยอดเงินไม่พอ",
        wallet_before: walletBefore,
        total_needed: total
      });
    }

    const [lrows] = await connection.query(
      `SELECT lotto_id FROM lotto_numbers 
       WHERE lotto_id IN (${lottoIds.map(() => '?').join(',')}) 
         AND status='in_cart' FOR UPDATE`,
      lottoIds
    );
    if (lrows.length !== lottoIds.length) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "บางรายการไม่อยู่ในตะกร้าแล้ว กรุณารีเฟรชตะกร้า"
      });
    }

    await connection.query(
      `UPDATE purchases 
         SET status='purchased' 
       WHERE purchase_id IN (${purchaseIds.map(() => '?').join(',')}) 
         AND status='pending'`,
      purchaseIds
    );
    await connection.query(
      `UPDATE lotto_numbers 
         SET status='sold' 
       WHERE lotto_id IN (${lottoIds.map(() => '?').join(',')}) 
         AND status='in_cart'`,
      lottoIds
    );

    const walletAfter = walletBefore - total;
    await connection.query(
      "UPDATE users SET wallet=? WHERE user_id=?",
      [walletAfter, user_id]
    );

    await connection.commit();
    return res.json({
      success: true,
      message: "ชำระเงินสำเร็จ",
      purchased_count: purchaseIds.length,
      total_paid: total,
      wallet_before: walletBefore,
      wallet_after: walletAfter
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error("POST /api/checkout error:", err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release(); // ⚠️ สำคัญมาก!
  }
});

//////////////////////////////keeen//////////////////////////////

// CLAIM PRIZE - FIXED
app.post("/api/claim-prize", authencationToken, async (req, res) => {
  console.log("===== CLAIM PRIZE START =====");
  const connection = await promisePool.getConnection();
  
  try {
    const { lotto_id } = req.body;
    const email = req.user.id;
    
    console.log("Email from token:", email);
    console.log("Lotto ID to claim:", lotto_id);

    if (!lotto_id) {
      return res.status(400).json({
        success: false,
        message: "Missing lotto_id"
      });
    }

    await connection.beginTransaction();

    // ตรวจสอบว่าผู้ใช้ซื้อหวยนี้จริงหรือไม่
    const purchaseCheckSql = `
      SELECT p.purchase_id, p.lotto_id, p.status, u.user_id, u.wallet, u.email
      FROM purchases p
      JOIN users u ON p.user_id = u.user_id
      WHERE u.email = ? AND p.lotto_id = ? AND p.status = 'purchased'
      FOR UPDATE
    `;
    
    const [purchaseRows] = await connection.query(purchaseCheckSql, [email, lotto_id]);

    if (purchaseRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "ไม่พบการซื้อหวยนี้หรือยังไม่ได้ชำระเงิน"
      });
    }

    const purchase = purchaseRows[0];
    console.log("Purchase found:", purchase);

    // ตรวจสอบว่าเคยขึ้นเงินแล้วหรือยัง
    const [lottoStatus] = await connection.query(
      "SELECT status FROM lotto_numbers WHERE lotto_id = ?",
      [lotto_id]
    );

    if (lottoStatus[0]?.status === 'cashed') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "เคยขึ้นเงินรางวัลนี้แล้ว"
      });
    }

    // ดึงรางวัลทั้งหมดที่ถูกของหวยใบนี้
    const winningSql = `
      SELECT wn.id, wn.prize_rank, wn.prize_amount, ln.number
      FROM winning_numbers wn
      JOIN lotto_numbers ln ON wn.lotto_id = ln.lotto_id
      WHERE wn.lotto_id = ?
      ORDER BY wn.prize_rank ASC
    `;
    
    const [winningRows] = await connection.query(winningSql, [lotto_id]);

    if (winningRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "หวยใบนี้ไม่ได้ถูกรางวัล"
      });
    }

    // คำนวณเงินรางวัลรวมทั้งหมด
    let totalPrizeAmount = 0;
    const prizeDetails = [];
    
    for (const winning of winningRows) {
      const prizeAmount = parseFloat(winning.prize_amount);
      totalPrizeAmount += prizeAmount;
      prizeDetails.push({
        prize_rank: winning.prize_rank,
        prize_amount: prizeAmount
      });
    }

    const currentWallet = parseFloat(purchase.wallet);
    const newWallet = currentWallet + totalPrizeAmount;

    console.log(`Total prize amount: ${totalPrizeAmount}, Current wallet: ${currentWallet}, New wallet: ${newWallet}`);
    console.log("Prize details:", prizeDetails);

    // อัปเดตเงินในกระเป๋า
    await connection.query(
      "UPDATE users SET wallet = ? WHERE user_id = ?",
      [newWallet, purchase.user_id]
    );

    // อัปเดต lotto_numbers status เป็น 'cashed'
    await connection.query(
      "UPDATE lotto_numbers SET status = 'cashed' WHERE lotto_id = ?",
      [lotto_id]
    );

    // อัปเดต purchases เพิ่ม cashout_date
    await connection.query(
      "UPDATE purchases SET cashout_date = NOW() WHERE purchase_id = ?",
      [purchase.purchase_id]
    );

    await connection.commit();
    
    console.log("Multiple prizes claimed successfully");

    res.json({
      success: true,
      message: "ขึ้นเงินรางวัลสำเร็จ",
      data: {
        total_prize_amount: totalPrizeAmount,
        wallet_before: currentWallet,
        wallet_after: newWallet,
        prizes: prizeDetails,
        lotto_number: winningRows[0].number,
        prizes_count: winningRows.length
      }
    });

  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error("Error in claim prize:", err);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการขึ้นเงินรางวัล"
    });
  } finally {
    connection.release(); // ⚠️ สำคัญมาก!
  }
  
  console.log("===== CLAIM PRIZE END =====");
});

// =============== START SERVER ===============
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌐 Server IP: ${ip}:${port}`);
});

// =============== GRACEFUL SHUTDOWN ===============
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  db.end((err) => {
    if (err) {
      console.error('Error closing database pool:', err);
    } else {
      console.log('Database pool closed');
    }
    process.exit(err ? 1 : 0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  db.end((err) => {
    if (err) {
      console.error('Error closing database pool:', err);
    } else {
      console.log('Database pool closed');
    }
    process.exit(err ? 1 : 0);
  });
});