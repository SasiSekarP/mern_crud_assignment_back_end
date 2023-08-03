// express js dependancies
const express = require("express");
const app = express();
const PORT = 4000;

// cors middle ware
const cors = require("cors");

// mongo db dependacies
const { MongoClient } = require("mongodb");
const mongourl = "mongodb://127.0.0.1:27017";

// bcrypt
const bcrypt = require("bcrypt");

// jwt token
const jwt = require("jsonwebtoken");
const private_key = "key";

const dbName = "taskmanager";
const collection1 = "signupdata";
const collection2 = "taskdetails";

app.use(cors());
app.use(express.json());

async function MongoDbConnection() {
  try {
    const client = await MongoClient.connect(mongourl);
    console.log("connected to mongodb");

    const db = client.db(dbName);
    const signupdata = db.collection(collection1);
    const taskdetailsarr = db.collection(collection2);

    // user name from token
    const tokenToUserName = async (req, res, next) => {
      const token = req.headers.authorization;

      if (token) {
        const { username } = await jwt.verify(token, private_key);

        req.username = username;
        next();
      }
    };

    // log in
    app.post("/sendtaskdetails", async (req, res) => {
      const { username, password } = req.body;

      if (username && password) {
        const userdata = await signupdata.findOne({ username });

        if (userdata) {
          const paswrodmatch = await bcrypt.compare(
            password,
            userdata.password
          );

          if (paswrodmatch) {
            const payload = {
              username,
            };
            const token = await jwt.sign(payload, private_key);
            res.json({ status: "success", token });
          } else {
            res.json({ status: "fail", err: "Password does not match" });
          }
        } else {
          res.json({ status: "fail", err: "No user found. Create an account" });
        }
      } else {
        res.json({ status: "fail", err: "No user found" });
      }
    });

    // sign up
    app.post("/signupdata", async (req, res) => {
      const { username, password } = req.body;

      const usernameavailability = await signupdata.findOne({ username });

      if (usernameavailability) {
        res.json({ status: "fail", err: "Username already exist" });
      } else {
        const hashedpassword = await bcrypt.hash(password, 10);
        signupdata.insertOne({ username, password: hashedpassword });

        taskdetailsarr.insertOne({ username, taskdetails: [] });

        res.json({ status: "success" });
      }
    });

    // home data fetch
    app.get("/sendhomepagedata", tokenToUserName, async (req, res) => {
      const username = req.username;

      const userdata = await taskdetailsarr.findOne({ username });

      const tasks = await userdata.taskdetails;

      res.json({ arr: tasks });
    });

    app.post("/addnewtask", tokenToUserName, async (req, res) => {
      const { username } = req;

      const userdata = await taskdetailsarr.findOne({ username });

      const taskdata = req.body;

      if (userdata) {
        taskdetailsarr.updateOne(
          { username },
          {
            $push: { taskdetails: taskdata },
          }
        );
        res.json({ message: "success" });
      } else {
        res.json({ message: "there is no use" });
      }
    });

    // sending single task data to update
    app.get("/singletaskdata/:id", tokenToUserName, async (req, res) => {
      const username = req.username;
      const { id } = req.params;
      const userdata = await taskdetailsarr.findOne({ username });
      const arr = userdata.taskdetails;
      const [task] = arr.filter((data) => {
        return data._id === id;
      });
      res.json(task);
    });

    // uploading edited data
    app.put("/updatethisdata/:_id", tokenToUserName, async (req, res) => {
      const username = req.username;

      const { _id } = req.params;

      const data = req.body;

      taskdetailsarr.updateOne(
        { username },
        {
          $pull: { taskdetails: { _id } },
        }
      );

      taskdetailsarr.updateOne(
        { username },
        {
          $push: { taskdetails: data },
        }
      );

      res.json({ status: "success" });
    });

    app.delete("/deletethisdata/:_id", tokenToUserName, async (req, res) => {
      const { username } = req;

      const { _id } = req.params;

      taskdetailsarr.updateOne(
        { username },
        {
          $pull: { taskdetails: { _id } },
        }
      );

      res.json({ status: "success" });
    });

    app.listen(PORT, () => {
      console.log(`port is listening on http://localhost:${4000}/`);
    });
  } catch (err) {
    console.log(`MongoDB error : ${err}`);
  }
}

MongoDbConnection();
