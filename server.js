const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// setup mongoose and database connection
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});
const bodyParser = require("body-parser");

// creating model
const Schema = mongoose.Schema;

const exerciseSessionSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [exerciseSessionSchema],
});

const Session = mongoose.model("Session", exerciseSessionSchema);
const User = mongoose.model("User", userSchema);

// Test 1
app.post(
  "/api/users",
  bodyParser.urlencoded({ extended: false }),
  (request, response) => {
    let newUser = new User({ username: request.body.username });
    newUser.save((error, savedUser) => {
      if (!error) {
        let responseObject = {};
        responseObject["username"] = savedUser.username;
        responseObject["_id"] = savedUser.id;
        response.json(responseObject);
      }
    });
  }
);

// Test 2
app.get("/api/users", (request, response) => {
  User.find({}, (error, arrayOfUsers) => {
    if (!error) {
      response.json(arrayOfUsers);
    }
  });
});

// Test 3
app.post(
  "/api/users/:_id/exercises",
  bodyParser.urlencoded({ extended: false }),
  (request, response) => {
    let newSession = new Session({
      description: request.body.description,
      duration: parseInt(request.body.duration),
      date: request.body.date,
    });

    if (newSession.date === "") {
      newSession.date = new Date().toISOString().substring(0, 10);
    }

    User.findByIdAndUpdate(
      request.params._id,
      { $push: { log: newSession } },
      { new: true },
      (error, updatedUser) => {
        if (!error) {
          let responseObject = {};
          responseObject["_id"] = updatedUser.id;
          responseObject["username"] = updatedUser.username;
          responseObject["date"] = new Date(newSession.date).toDateString();
          responseObject["description"] = newSession.description;
          responseObject["duration"] = newSession.duration;
          response.json(responseObject);
        }
      }
    );
  }
);

// Test 4,5,6
app.get("/api/users/:_id/logs", (request, response) => {
  User.findById(request.params, (error, result) => {
    if (!error) {
      let responseObject = result;
      // from and to Test 6
      if (request.query.from || request.query.to) {
        let fromDate = new Date(0);
        let toDate = new Date();

        if (request.query.from) {
          fromDate = new Date(request.query.from);
        }

        if (request.query.to) {
          toDate = new Date(request.query.to);
        }

        fromDate = fromDate.getTime();
        toDate = toDate.getTime();

        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime();

          return sessionDate >= fromDate && sessionDate <= toDate;
        });
      }
      // limit Test 6
      if (request.query.limit) {
        responseObject.log = responseObject.log.slice(0, request.query.limit);
      }
      // count Test 5
      responseObject = responseObject.toJSON();
      responseObject["count"] = result.log.length;
      response.json(responseObject);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
