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

const { auth } = require("./auth");
const { response } = require("express");

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
app.post("/logout", (req, res) => {});

app.get("/places", async (req, res) => {
  const [placeList] = await pool.execute("SELECT * FROM place");
  return res.json({ success: true, place: placeList });
});

app.get("/place/:placeId/detail", async (req, res) => {
  const placeId = req.params.placeId;
  const [placeInfo] = await pool.execute(
    "SELECT place.name, COUNT(*) FROM place JOIN id ON place.id=event.place_id WHERE place_id=? AND is_finish=?",
    [placeId, false]
  );
  console.log(placeInfo);
  return res.json({ success: true, info: placeInfo });
});

app.post("/event", auth, async (req, res) => {
  const {
    eventName,
    placeId,
    maxNumOfTeamMember,
    startTime,
    hikingTime,
    startPoint,
    endPoint,
    path,
    difficulty,
    distance,
    description,
  } = req.body;
  const username = req.userInfo.user;

  if (
    !eventName ||
    !placeId ||
    !startTime ||
    !hikingTime ||
    !startPoint ||
    !endPoint
  ) {
    return res.json({
      success: false,
      message: "Please provide the necessary information",
    });
  }

  await pool.execute(
    "INSERT INTO event (event_name, host, place_id, maxnum_teammate, event_start_time, start_location, end_location, path, difficulty, distance, description, is_finish, hiking_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      eventName,
      username,
      placeId,
      maxNumOfTeamMember,
      startTime,
      startPoint,
      endPoint,
      path,
      difficulty,
      distance,
      description,
      false,
      hikingTime,
    ]
  );

  return res.json({ success: true, message: "Create an event successfully" });
});

app.post("/event/:eventId/member", auth, async (req, res) => {
  const { userId } = req.userInfo.userId;
  const eventId = parseInt(req.params.eventId);
  const [result] = await pool.execute(
    "SELECT * FROM join_record WHERE member_id=? AND event_id=? AND status=?",
    [userId, eventId, "joined"]
  );
  if (result.length >= 1) {
    return res.json({
      success: false,
      message: "You have already joined the event",
    });
  } else {
    await pool.execute(
      "INSERT INTO join_record (member_id, event_id, status) VALUES (?,?,?)",
      [userId, eventId, "joined"]
    );
    return res.json({ success: true, message: "Event joined" });
  }
});

app.delete("/event/:eventId/member", auth, async (req, res) => {
  const { userId } = req.userInfo.userId;
  const eventId = parseInt(req.params.eventId);
  const [result] = await pool.execute(
    "SELECT * FROM join_record WHERE member_id=? AND event_id=?",
    [userId, eventId]
  );
  if (result[0].status === "joined") {
    await pool.execute(
      "UPDATE join_record SET status=? WHERE member_id=? AND event_id=?",
      ["left", userId, eventId]
    );
    return res.json({
      success: true,
      message: "You have left the event",
    });
  } else {
    return res.json({
      success: false,
      message: "Fail to quit the team since you did not join the event",
    });
  }
});

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
