const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const campaignSchema = new mongoose.Schema({
  category: String,
  title: String,
  description: String,
  srcVideo: String,
  raised: Number,
  target: Number,
  backer: Number,
  day: Number,
});

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please provide full name"],
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      //required: [true, "Please confirm your password"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not same",
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    optExpires: {
      type: Date,
      default: null,
    },
    resetPasswordOTP: {
      type: String,
      default: null,
    },
    resetPasswordOTPExpires: {
      type: Date,
      default: null,
    },

    // Embedded documents for campaigns created by the user
    createdCampaigns: [campaignSchema],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;

  next();
});

userSchema.methods.correctPassword = async function (password, userPassword) {
  return await bcrypt.compare(password, userPassword);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
