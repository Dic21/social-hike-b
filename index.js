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

const {auth} = require("./auth");
const { response } = require("express");

app.use(express.json());
app.use('/upload-files', express.static('upload-files'));
app.use(express.urlencoded({ extended: true }));

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


app.get("/places", async (req, res) => {
  const [placeList] = await pool.execute("SELECT place.name, place.id, place.chi_name, place.description, ae.num FROM place LEFT JOIN (SELECT place_id, COUNT(*) AS num FROM event WHERE is_finish=false AND event_start_time > NOW() GROUP BY place_id) ae ON place.id=ae.place_id;");
  return res.json(
    {success: true,
    place: placeList}
  );
});

app.get("/place/:placeId", async (req, res) => {
  const placeId = req.params.placeId;
  const [placeInfo] = await pool.execute("SELECT place.name, place.id, place.chi_name, place.description, ae.num, cm.cmnum FROM place LEFT JOIN (SELECT place_id, COUNT(*) AS num FROM event WHERE is_finish=false AND event_start_time > NOW() GROUP BY place_id) ae ON place.id=ae.place_id LEFT JOIN (SELECT COUNT(*) AS cmnum,place_id FROM comment GROUP BY place_id) cm ON place.id=cm.place_id WHERE place.id=?;", [placeId]);

  const [eventList] = await pool.execute("SELECT * FROM event WHERE place_id=? AND is_finish=false AND event_start_time > NOW() ORDER BY id DESC ;", [placeId]);

  return res.json({
    success: true,
    info: placeInfo,
    event: eventList
  });
});

app.get("/place/:placeId/comment", async(req, res)=>{
  let placeId = req.params.placeId;
  let limit = req.query.limit;
  if(limit){
    const [cmList] = await pool.execute(`SELECT * FROM comment WHERE place_id=? ORDER BY publish_date DESC LIMIT ${limit}, 2`, [placeId]);
    return res.json({
      success: true,
      cm: cmList
    });
  }else{
    return res.json({
      success: false,
      message: 'Please provide offset number'
    })
  }
})

app.post("/event", auth, async (req, res) => {
  const {eventName, placeId, maxNumOfTeamMember, startTime, hikingTime, startPoint, endPoint, path, difficulty, distance, description} = req.body;
  const username = req.userInfo.user;

  if(!eventName || !placeId || !startTime || !hikingTime || !startPoint || !endPoint){
    return res.json({
      success: false,
      message: "Please provide the necessary information"
    });
  }
  
  await pool.execute("INSERT INTO event (event_name, host, place_id, maxnum_teammate, event_start_time, start_location, end_location, path, difficulty, distance, description, is_finish, hiking_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  [eventName, username, placeId, maxNumOfTeamMember, startTime, startPoint, endPoint, path, difficulty, distance, description, false, hikingTime]);

  return res.json({ success: true, message: 'Create an event successfully'});

});

app.post("/event/:eventId/member", auth, async (req, res) => {
  const {user, userId} = req.userInfo;
  const eventId = parseInt(req.params.eventId);

  const [eventInfo] = await pool.execute("SELECT event.id, host, join_record.member_id, join_record.status FROM event LEFT JOIN join_record ON join_record.event_id=event.id WHERE event.id=?", [eventId]);

  let isOwner = eventInfo.find((record)=>{return record.host===user})
  if(isOwner){
    return res.json({
      success: false,
      message: "You cannot join the event created by yourself"
    })
  }else{
    let target = eventInfo.find((record)=>{return record["member_id"]===userId;})
    if(target && target.status === "joined"){
        return res.json({
        success: false,
        message: "You have already joined the event"
      })
    }else if(target && target.status === "left"){
      await pool.execute(`UPDATE join_record SET status="joined"`);
      return res.json({
        success: true,
        message: "Event joined"
      })
    }else{
      await pool.execute("INSERT INTO join_record (member_id, event_id, status) VALUES (?,?,?)", [userId, eventId, "joined"]);
      return res.json({
        success: true,
        message: "Event joined"
      })
    }
  }
});

app.delete("/event/:eventId/member", auth, async (req, res) => {
  const {user, userId} = req.userInfo;
  const eventId = parseInt(req.params.eventId);

  const [eventInfo] = await pool.execute("SELECT event.id, host, join_record.member_id, join_record.status FROM event LEFT JOIN join_record ON join_record.event_id=event.id WHERE event.id=?", [eventId]);

  let target = eventInfo.find((record)=>{return record["member_id"]===userId;})
  if(target && target.status === "joined"){
    await pool.execute("UPDATE join_record SET status=? WHERE member_id=? AND event_id=?", ["left", userId, eventId]);
    return res.json({
      success: true,
      message: "You have left the event"
    })
  }else{
    return res.json({
      success: false,
      message: "Fail to quit the team since you did not join the event"
    })
  }
});

app.post("/place/:placeId/comment", auth, upload.array('pictures'), async(req, res)=>{
  const {user, userId} = req.userInfo;
  const placeId = req.params.placeId;
  const message = req.body.message;
  const date = new Date();

  if(!message){
    return res.json({
      success: false,
      message: "Please enter your message"
    })
  }

  //if pictures included
  if(req.files.length >= 1){
    await pool.execute("INSERT INTO comment ( place_id, publisher, message, publish_date, is_photo) VALUES (?,?,?,?,?)", [ placeId,
      user, message, date, true])
      
    let prepareParams = [];
    for (let i = 0; i < req.files.length; i++) {
      let sql = [];
      let picPath = `/${req.files[i].destination}${req.files[i].filename}`;
      sql.push("(?,?,?)");
      prepareParams.push(id);
      prepareParams.push(picPath);
      prepareParams.push(id);
    };
    let result = sql.join(",");
    //await pool.execute(`INSERT INTO album (id, path, commentId) VALUES (?,?),(?,?),(?,?)`,[result]);
    await pool.execute(`INSERT INTO album (id, path, commentId) VALUES ${result}`,[prepareParams]);
    return res.json('hewwy');
  }else{
    const [cmresult, fieldInfo] = await pool.execute("INSERT INTO comment ( place_id, publisher, message, publish_date, is_photo) VALUES (?,?,?,?,?)", [ placeId,
      user, message, date, false])
      console.log("cmresult", cmresult.insertId);
      console.log("fieldInfo", fieldInfo);
    return res.json('hey');
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
