const express = require("express");
const { getMyCampaigns, createCampaign } = require("../controller/campaignController");
const isAuthenticated = require("../middlewares/isAuthenticated");

const router = express.Router();

router.get("/my-campaigns", isAuthenticated, getMyCampaigns);
router.post("/create", isAuthenticated, createCampaign);

module.exports = router;