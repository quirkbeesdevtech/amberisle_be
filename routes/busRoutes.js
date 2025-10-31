const express = require("express");
const router = express.Router();
const { getBuses, createBus, updateBus, deleteBus } = require("../controllers/busController");

router.get("/", getBuses);
router.post("/", createBus);
router.put("/:id", updateBus);
router.delete("/:id", deleteBus);

module.exports = router;
