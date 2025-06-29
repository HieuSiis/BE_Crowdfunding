const User = require("../model/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getMyCampaigns = catchAsync(async (req, res, next) => {
    console.log("object", req.user);
  const user = await User.findById(req.user.id).select("createdCampaigns");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    results: user.createdCampaigns.length,
    data: {
      createdCampaigns: user.createdCampaigns,
    },
  });
});

exports.createCampaign = catchAsync(async (req, res, next) => {
  const {category,title, description, srcVideo,raised,target,backer, day,} = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const newCampaign = {category,title, description,srcVideo,raised: raised || 0,target,backer: backer || 0, day,};

  user.createdCampaigns.push(newCampaign);
  await user.save();

  res.status(201).json({
    status: "success",
    data: {
      campaign: newCampaign,
    },
  });
});