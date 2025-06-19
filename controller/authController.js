const User = require("../model/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");
const generateOtp = require("../utils/generateOtp");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only secure in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
  };
  res.cookie("token", token, cookieOptions);

  user.password = undefined;
  user.passwordConfirm = undefined;
  user.otp = undefined;

  res.status(statusCode).json({
    status: "success",
    message,
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, fullName } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) return next(new AppError("Email already registered", 400));

  const otp = generateOtp();

  const optExpires = Date.now() + 24 * 60 * 60 * 1000;

  const newUser = await User.create({
    fullName,
    email,
    password,
    otp,
    optExpires,
  });

  try {
    await sendEmail({
      email: newUser.email,
      subject: "OTP for email verification",
      html: `<h1>Your OTP is: ${otp}</h1>`,
    });

    createSendToken(newUser, 200, res, "Registration successful");
  } catch (error) {
    await User.findByIdAndDelete(newUser.id);
    return next(
      new AppError("There is an error sending the email. Try again", 500)
    );
  }
});

exports.verifyAccount = catchAsync(async (req, res, next) => {
  const { otp } = req.body;

  if (!otp) {
    return next(new AppError("Otp is missing", 400));
  }

  const user = req.user;

  if (user.otp !== otp) {
    return next(new AppError("Invalid OTP", 400));
  }

  if (Date.now() > user.optExpires) {
    return next(new AppError("Otp has expired. Please request a new OTP", 400));
  }

  user.isVerified = true;
  user.otp = undefined;
  user.optExpires = undefined;

  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res, "Email has been verified");
});

exports.resendOtp = catchAsync(async (req, res, next) => {
  const email = req.user;

  if (!email) {
    return next(new AppError("Email is required to resend otp", 400));
  }

  const user = await User.findOne(email);

  if (!user) {
    return next(new AppError("User not Found", 404));
  }

  if (user.isVerified) {
    return next(new AppError("This account is already verified", 400));
  }

  const newOtp = generateOtp();

  user.otp = newOtp;
  user.optExpires = Date.now() + 24 * 60 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: "Resend otp for email verification",
      html: `<h1>Your New otp is: ${newOtp}</h1>`,
    });

    res.status(200).json({
      status: "success",
      message: "A new otp has sent to your email",
    });
  } catch (error) {
    user.otp = undefined;
    user.optExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There is an error sending the email ! Please try again")
    );
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  // Compare the password with the password save in the db
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect Email or Password", 401));
  }

  createSendToken(user, 200, res, "Login Successful");
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie("token", "logged out", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

const RefreshToken = (user, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only secure in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
  };
  res.cookie("token", token, cookieOptions);
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("Email account does not exist", 404));
  }

  const otp = generateOtp();

  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpires = Date.now() + 300000; // 5 minutes

  await user.save({ validateBeforeSave: false });
  RefreshToken(user, res);

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password Reset Otp (valid for 5min)",
      html: `<h1>Your password reset Otp: ${otp}</h1>`,
    });

    res.status(200).json({
      status: "success",
      message: "Password reset otp is send to your email",
    });
  } catch (error) {
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. please try again later"
      )
    );
  }
});

exports.verifyForgotPassword = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  console.log("otp", otp);
  if (!otp) {
    return next(new AppError("Otp is missing", 400));
  }

  const user = req.user;
  console.log("user", user);
  console.log("resetPasswordOTP", user.resetPasswordOTP);
  if (user.resetPasswordOTP !== otp) {
    return next(new AppError("Invalid OTP", 400));
  }

  if (Date.now() > user.resetPasswordOTPExpires) {
    return next(new AppError("Otp has expired. Please request a new OTP", 400));
  }

  //user.isVerified = true;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpires = undefined;

  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res, "Email has been verified");
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, password, passwordConfirm } = req.body;

  const user = await User.findOne({
    email,
    // resetPasswordOTP: otp,
    // resetPasswordOTPExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError("No user found", 400));

  (user.password = password), (user.passwordConfirm = passwordConfirm);
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpires = undefined;

  await user.save();

  createSendToken(user, 200, res, "Password reset successfully");
});

exports.googleAuth = catchAsync(async (req, res, next) => {
  const { email, fullName, photo } = req.body;
  console.log("object", req.body);
  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      fullName,
      photo,
      isVerified: true,
      password: crypto.randomBytes(16).toString("hex"),
    });
  }

  createSendToken(user, 200, res, "Google login successful");
});
