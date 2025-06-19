const express = require("express");
const {
  signup,
  verifyAccount,
  resendOtp,
  login,
  logout,
  forgetPassword,
  resetPassword,
  verifyForgotPassword,
  googleAuth,
} = require("../controller/authController");
const isAuthenticated = require("../middlewares/isAuthenticated");
const router = express.Router();

router.post("/sign-up", signup);
router.post("/verify", isAuthenticated, verifyAccount);
router.post("/resend-otp", isAuthenticated, resendOtp);
router.post("/sign-in", login);
router.post("/sign-out", logout);
router.post("/forget-password", forgetPassword);
router.post("/verify-forgot-password", isAuthenticated, verifyForgotPassword);
router.post("/reset-password", resetPassword);
router.post("/auth/google", googleAuth);

module.exports = router;
