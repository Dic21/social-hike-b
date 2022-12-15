const express = require("express");
const mysql = require("mysql2");
let pool = null;

const dotenv = require("dotenv");
dotenv.config();

pool = mysql
    .createPool({
    host: "database-1.cywpdlwq4ycg.ap-northeast-1.rds.amazonaws.com",
    port: 3306,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: "project",
    })
    .promise();

exports.pool = pool;