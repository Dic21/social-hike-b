const express = require("express");
const mysql = require("mysql2");
let pool = null;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwtSecret = "privateKey";
const multer = require("multer");
const storage = multer.diskStorage({
  destination: "./upload-files",
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const saltRound = 12;
const upload = multer({ storage: storage });
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = 4000;

app.use(express.json());

app.get("/member-list", async (req, res) => {
  const [user] = await pool.query(`select * from member`);
  res.json(user);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const registerTime = new Date().toISOString();

  // const [users] = await pool.query(`select username from member`);
  const [user] = await pool.execute(
    `select username from member where username=?`,
    [username]
  );

  if (user.length === 0) {
    if (username && password) {
      await bcrypt.hash(password, saltRound).then(async (hashed) => {
        const [rows, fieldInfo] = await pool.execute(
          //   `select username from member`
          `insert into member(username,password,register_time) values(?,?,?) `,
          [username, hashed, registerTime]
        );

        // console.log(rows);

        return res.json({
          success: true,
          message: "Register successfully",
          data: { username, registerTime },
        });
      });
    } else {
      return res.json({
        success: false,
        message: "Error! Please enter username and/or password.",
      });
    }
  } else {
    res.json({
      success: false,

      message:
        "This username has been registered! Please use another username!",
    });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const [user] = await pool.execute(`select * from member where username=?`, [
    username,
  ]);

  console.log(user);
  if (user.length === 1) {
    bcrypt.compare(password, user[0].password).then((result) => {
      if (result) {
        const payload = {
          user: username,
          userId: user[0].id,
          registerTime: user[0].register_time,
        };
        // console.log(payload);

        const token = jwt.sign(payload, jwtSecret);

        return res.json({ success: true, message: "Login success", token });
      } else {
        return res.json({ success: false, message: "Login failed" });
      }
    });
  } else {
    return res.json({ success: false, message: "User does not exists" });
  }
});
app.post("/logout", (req, res) => {});
app.get("/places", (req, res) => {});
app.get("/place/:placeId/detail", (req, res) => {});
app.post("/event", (req, res) => {});
app.post("/event/join", (req, res) => {});
app.get("/event/:eventId", (req, res) => {});
app.get("/event/:eventId/chat", (req, res) => {});
app.get("/event/:eventId/ member/:memberId/last-location", (req, res) => {});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  pool = mysql
    .createPool({
      host: "database-1.cywpdlwq4ycg.ap-northeast-1.rds.amazonaws.com",
      port: "3306",
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: "project",
    })
    .promise();
});
