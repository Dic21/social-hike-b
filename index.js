const express = require("express");

const app = express();
const port = 4000;

app.use(express.json());

app.post("/register", (req, res) => {});
app.post("/login", (req, res) => {});
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
});
