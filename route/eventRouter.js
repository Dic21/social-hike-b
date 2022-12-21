const express = require("express");
const router = express.Router();
let { pool } = require("../database");
const { auth } = require("../auth");

router.post("/", auth, async (req, res) => {
  const {
    eventName,
    placeId,
    maxNumOfTeamMember,
    startTime,
    hikingTime,
    startPoint,
    endPoint,
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

  const [insertResult] = await pool.execute(
    "INSERT INTO event (event_name, host, place_id, maxnum_teammate, event_start_time, start_location, end_location, difficulty, distance, description, is_finish, hiking_time) VALUES (?, ?, ?, ?, ?, Point(?,?), Point(?,?), ?, ?, ?, ?, ?)",
    [
      eventName,
      username,
      placeId,
      maxNumOfTeamMember,
      startTime,
      startPoint.x,
      startPoint.y,
      endPoint.x,
      endPoint.y,

      difficulty,
      distance,
      description,
      false,
      hikingTime,
    ]
  );

  return res.json({
    success: true,
    insertId: insertResult.insertId,
    message: "Create an event successfully",
  });
});

router.get("/:eventId/detail", async (req, res) => {
  const eventId = req.params.eventId;

  console.log(eventId);
  const [eventInfo] = await pool.execute(
    "SELECT * from event WHERE id=? AND is_finish=?",
    [eventId, false]
  );

  return res.json({ success: true, eventInfo });
});

router.post("/:eventId/member", auth, async (req, res) => {
  const { user, userId } = req.userInfo;
  const eventId = parseInt(req.params.eventId);

  const [eventInfo] = await pool.execute(
    "SELECT event.id, host, join_record.member_id, join_record.status FROM event LEFT JOIN join_record ON join_record.event_id=event.id WHERE event.id=?",
    [eventId]
  );

  let isOwner = eventInfo.find((record) => {
    return record.host === user;
  });
  // if (isOwner) {
  //   await pool.execute(
  //     "INSERT INTO join_record (member_id, event_id, status) VALUES (?,?,?)",
  //     [userId, eventId, "joined"]
  //   );
  //   return res.json({
  //     success: true,
  //     message: "You join the event as a host",
  //   });
  // } else {
  let target = eventInfo.find((record) => {
    return record["member_id"] === userId;
  });
  if (target && target.status === "joined") {
    return res.json({
      success: false,
      message: "You have already joined the event",
      user,
    });
  } else if (target && target.status === "left") {
    await pool.execute(`UPDATE join_record SET status="joined"`);
    return res.json({
      success: true,
      message: "Event joined",
      user,
    });
  } else {
    await pool.execute(
      "INSERT INTO join_record (member_id, event_id, status) VALUES (?,?,?)",
      [userId, eventId, "joined"]
    );

    if (isOwner) {
      return res.json({
        success: true,
        message: "You joined the event as a host",
        user,
      });
    } else {
      return res.json({
        success: true,
        message: "Event joined",
        user,
      });
    }
  }
});

router.delete("/:eventId/member", auth, async (req, res) => {
  const { user, userId } = req.userInfo;
  const eventId = parseInt(req.params.eventId);

  const [eventInfo] = await pool.execute(
    "SELECT event.id, host, join_record.member_id, join_record.status FROM event LEFT JOIN join_record ON join_record.event_id=event.id WHERE event.id=?",
    [eventId]
  );

  let target = eventInfo.find((record) => {
    return record["member_id"] === userId;
  });
  if (target && target.status === "joined") {
    await pool.execute(
      "UPDATE join_record SET status=? WHERE member_id=? AND event_id=?",
      ["left", userId, eventId]
    );
    return res.json({
      success: true,
      message: `${user},You have left the event`,
    });
  } else {
    return res.json({
      success: false,
      message: "Fail to quit the team since you did not join the event",
      target,
    });
  }
});

// router.get("/:eventId/chat", (req, res) => {});
// router.get("/:eventId/ member/:memberId/last-location", (req, res) => {});

router.post("/:eventId/location", auth, async (req, res) => {
  const { user } = req.userInfo;
  const eventId = parseInt(req.params.eventId);
  const { lat, lng } = req.body;

  const [result] = await pool.execute(
    "SELECT * from location WHERE event_id=? and name=?",
    [eventId, user]
  );

  if (result) {
    const [deleteLocation] = await pool.execute(
      "delete from location WHERE event_id=? and name=?",
      [eventId, user]
    );
    const [insertLocation] = await pool.execute(
      "INSERT INTO location (event_id, name,location) VALUES (?, ?, Point(?,?))",
      [eventId, user, lat, lng]
    );
  } else {
    const [insertLocation] = await pool.execute(
      "INSERT INTO location (event_id, name,location) VALUES (?, ?, Point(?,?))",
      [eventId, user, lat, lng]
    );
  }

  return res.json({ sucess: true, message: "Location recorded successfully" });
});

router.get(
  "/:eventId/participants-current-location",
  auth,
  async (req, res) => {
    const eventId = parseInt(req.params.eventId);

    const [location] = await pool.execute(
      "SELECT * from location WHERE event_id=?",
      [eventId]
    );
    return res.json({
      sucess: true,
      message: location,
    });
  }
);
module.exports = router;
