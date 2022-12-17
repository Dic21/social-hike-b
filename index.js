const express = require("express");
// const mysql = require("mysql2");
// let pool = null;
// const dotenv = require("dotenv");
// dotenv.config();

const app = express();
const port = 4000;
const { createServer } = require("http");
const { Server } = require("socket.io");
const http = createServer(app);
const io = new Server(http);
require("./chatroom-socket-server")(io);
const bodyParser = require("body-parser");

const userRouter = require("./route/userRouter");
const eventRouter = require("./route/eventRouter");
const placeRouter = require("./route/placeRouter");
const walkieRouter = require("./route/walkieRouter");

app.use(express.json());
app.use(express.static("public"));
app.use(bodyParser.json());
app.use("/upload-files", express.static("upload-files"));
app.use(express.urlencoded({ extended: true }));

app.use("/", userRouter);
app.use("/event", eventRouter);
app.use("/place", placeRouter);
app.use("/walkie", walkieRouter);

http.listen(port, () => {
  // console.log(`Server listening on ${port}`);
  console.log(`Server running on port ${port}`);
  // pool = mysql
  //   .createPool({
  //     host: "database-1.cywpdlwq4ycg.ap-northeast-1.rds.amazonaws.com",
  //     port: 3306,
  //     user: process.env.DATABASE_USER,
  //     password: process.env.DATABASE_PASSWORD,
  //     database: "project",
  //   })
  //   .promise();
});

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
//   pool = mysql
//     .createPool({
//       host: "database-1.cywpdlwq4ycg.ap-northeast-1.rds.amazonaws.com",
//       port: "3306",
//       user: process.env.DATABASE_USER,
//       password: process.env.DATABASE_PASSWORD,
//       database: "project",
//     })
//     .promise();
// });
