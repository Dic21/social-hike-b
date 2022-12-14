const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const port = 5500;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

app.use(express.static('public'));


io.on("connection", (socket) => {
  console.log('user connected');

  socket.on("chat message", function(msg){
    console.log("message:", msg);
    io.emit("allMessage", msg);
  })

  socket.on("audioMessage", function(msg) {
    io.emit("audioMessage", msg);
  });


  socket.on("disconnect", ()=>{
    console.log('user disconnected');
  })
});

httpServer.listen(port, ()=>{
  console.log('Server running');
});

