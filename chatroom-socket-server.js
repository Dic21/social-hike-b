module.exports = function (socketIO) {
  let users = [];

  //Add this before the app.get() block
  socketIO.on("connection", (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    socket.on("join", function (room) {
      console.log("join", room);
      socket.join("" + room);
      // socket.emit("join-room-message", `You've join ${room} room`);
      // socketIO.to(room).emit("room-brocast", `${socket.id} has join this room`);
    });

    socket.on("message", (data) => {
      console.log(data);
      socketIO.to(data.room).emit("messageResponse", data);
    });

    socket.on("typing", (data) =>
      socket.broadcast.emit("typingResponse", data)
    );

    //Listens when a new user joins the server
    socket.on("newUser", (data) => {
      //Adds the new user to the list of users
      console.log(data);
      users.push(data);
      // console.log(users);
      //Sends the list of users to the client
      socketIO.emit("newUserResponse", users);
    });

    socket.on("disconnect", () => {
      console.log("🔥: A user disconnected");
      //Updates the list of users when a user disconnects from the server
      users = users.filter((user) => user.socketID !== socket.id);
      // console.log(users);
      //Sends the list of users to the client
      socketIO.emit("newUserResponse", users);
      socket.disconnect();
    });
  });
};

// http.listen(PORT, () => {
//   console.log(`Server listening on ${PORT}`);
// });

// const express = require("express");
// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const port = 4000;

// const app = express();
// const httpServer = createServer(app);
// const io = new Server(httpServer, { /* options */ });

// app.use(express.static('public'));

// io.on("connection", (socket) => {
//   console.log('user connected');

//   socket.on("chat message", function(msg){
//     console.log("message:", msg);
//     io.emit("allMessage", msg);
//   })

//   socket.on("audioMessage", function(msg) {
//     io.emit("audioMessage", msg);
//   });

//   socket.on("disconnect", ()=>{
//     console.log('user disconnected');
//   })
// });

// httpServer.listen(port, ()=>{
//   console.log('Server running');
// });
