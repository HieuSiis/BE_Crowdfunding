const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const globalErrorHandler = require("./controller/errorController");
const userRouter = require("./routes/userRouters");
const campaignRouter = require("./routes/campaignRouters");
const AppError = require("./utils/appError");

const app = express();

app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:3000", "https://fe-crowdfunding.vercel.app"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/users", userRouter);
app.use("/api/campaigns", campaignRouter);

// Users api urls
// app.all("*", (req, res, next) => {
//   next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

app.use(globalErrorHandler);

module.exports = app;
