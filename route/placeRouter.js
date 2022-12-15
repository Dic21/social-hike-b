const express = require('express');
const router = express.Router();
let { pool } = require("../database");
const { auth } = require("../auth");
const multer = require("multer");
const storage = multer.diskStorage({
  destination: "./upload-files",
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});
const upload = multer({ storage: storage });


router.get("/:placeId", async (req, res) => {
    const placeId = req.params.placeId;
    const [placeInfo] = await pool.execute(
        "SELECT place.name, place.id, place.chi_name, place.description, ae.num, cm.cmnum FROM place LEFT JOIN (SELECT place_id, COUNT(*) AS num FROM event WHERE is_finish=false AND event_start_time > NOW() GROUP BY place_id) ae ON place.id=ae.place_id LEFT JOIN (SELECT COUNT(*) AS cmnum,place_id FROM comment GROUP BY place_id) cm ON place.id=cm.place_id WHERE place.id=?;",
        [placeId]
    );

    const [eventList] = await pool.execute(
        "SELECT * FROM event WHERE place_id=? AND is_finish=false AND event_start_time > NOW() ORDER BY id DESC ;",
        [placeId]
    );

    return res.json({
        success: true,
        info: placeInfo,
        event: eventList,
    });
});

router.get("/:placeId/comment", async (req, res) => {
    let placeId = req.params.placeId;
    let limit = req.query.limit;
    if (limit) {
        const [cmList] = await pool.execute(
            `SELECT * FROM comment LEFT JOIN  (SELECT comment_id, JSON_ARRAYAGG(path) AS path from album GROUP BY comment_id) al ON al.comment_id=comment.id WHERE place_id=? ORDER BY publish_date DESC LIMIT ${limit}, 2`,
            [placeId]
        );

        return res.json({
            success: true,
            cm: cmList,
        });
    } else {
        return res.json({
            success: false,
            message: "Please provide offset number",
        });
    }
});

router.post("/:placeId/comment", auth, upload.array("pictures"), async (req, res) => {
    const { user, userId } = req.userInfo;
    const placeId = req.params.placeId;
    const message = req.body.message;
    const date = new Date();

    if (!message) {
        return res.json({
            success: false,
            message: "Please enter your message",
        });
    }

    //if pictures included
    if (req.files && req.files.length >= 1) {
        const [cmresult, fieldInfo] = await pool.execute(
            "INSERT INTO comment ( place_id, publisher, message, publish_date, is_photo) VALUES (?,?,?,?,?)",
            [placeId, user, message, date, true]
        );
        let sql = [];
        let prepareParams = [];
        for (let i = 0; i < req.files.length; i++) {
            let id = Math.floor((Date.now() * Math.random()) / 1000);
            let picPath = `${req.files[i].destination}/${req.files[i].filename}`;
            sql.push("(?,?,?)");
            prepareParams.push(`i${id}`);
            prepareParams.push(picPath);
            prepareParams.push(cmresult.insertId);
        }
        let result = sql.join(",");
        await pool.execute(
            `INSERT INTO album (id, path, comment_id) VALUES ${result}`,
            prepareParams
        );
        return res.json({
            success: true,
            message: "You have posted a comment with image",
        });
    } else {
        const [cmresult, fieldInfo] = await pool.execute(
            "INSERT INTO comment ( place_id, publisher, message, publish_date, is_photo) VALUES (?,?,?,?,?)",
            [placeId, user, message, date, false]
        );
        console.log("cmresult", cmresult.insertId);
        console.log("fieldInfo", fieldInfo);
        return res.json({
            success: true,
            message: "You have posted a comment",
        });
    }
}
);

module.exports = router;