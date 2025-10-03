const express = require("express");
const router = express.Router();
const { getBuses, createBus } = require("../controllers/busController");

router.get("/", getBuses);
router.post("/", createBus);

module.exports = router;
