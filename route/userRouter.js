const express = require('express');
const router = express.Router();
let { pool } = require("../database");
const { auth } = require("../auth");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwtSecret = "privateKey";
const saltRound = 12;

router.get("/member-list", async (req, res) => {
    const [user] = await pool.query(`select * from member`);
    res.json(user);
});

router.post("/register", async (req, res) => {
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

router.post("/login", async (req, res) => {
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
          return res.json({
            success: false,
            message: "Incorrect username/password",
          });
        }
      });
    } else {
      return res.json({ success: false, message: "Incorrect username/password" });
    }
});

router.post("/logout", (req, res) => {
    res.json({ success: true, message: "logout successfully" });
});

router.get("/get-current-user", auth, async (req, res) => {
    // console.log(req.userInfo.user);
    return res.json({ user: req.userInfo });
});

router.post("/join-record", async (req, res) => {
    const { eventId } = req.body;
    const [result] = await pool.execute(
      "SELECT * FROM join_record WHERE event_id=? ",
      [eventId]
    );
    return res.json({ success: true, length: result.length, result });
});

router.get("/places", async (req, res) => {
    const [placeList] = await pool.execute(
      "SELECT place.name, place.id, place.chi_name, place.description, ae.num FROM place LEFT JOIN (SELECT place_id, COUNT(*) AS num FROM event WHERE is_finish=false AND event_start_time > NOW() GROUP BY place_id) ae ON place.id=ae.place_id;"
    );
    return res.json({ success: true, place: placeList });
});

module.exports = router;