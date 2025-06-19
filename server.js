const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });
const app = require("./app");

const db = process.env.DB;
// application to database
mongoose
  .connect(db)
  .then(() => {
    console.log("DB connection successful");
  })
  .catch((err) => {
    console.log(err);
  });

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
