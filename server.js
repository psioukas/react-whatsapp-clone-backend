import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import statusCodes from "response-status-codes";
import dotEnv from "dotenv";
import Messages from "./dbMessages.js";
import Pusher from "pusher";

//  app config
const app = express();
dotEnv.config();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: "1077077",
  key: "f60cf602b053992283d4",
  secret: "72127582ab4497b88d68",
  cluster: "eu",
  encrypted: true,
});

//  middlewares

app.use(express.json());

app.use((req, res, next) => {
  //use this instead of cors() <-> app.use(cors());
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

//  DB config

const connection_url = `mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_PASS}@cluster0.4pnwi.mongodb.net/db-whatsappclone?retryWrites=true&w=majority`;

mongoose.connect(connection_url, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.once("open", () => {
  console.log("DB is connected");

  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch(); // Listener for pusher
  changeStream.on("change", (change) => {
  
    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Error triggering Pusher");
    }
  });
});

//  pusher

pusher.trigger("my-channel", "my-event", {
  message: "hello world",
});

//  API endpoint

app.get("/", (req, res) => {
  res.status(statusCodes.OK).send("Node Server running");
});

app.post("/api/v1/messages/new", (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(statusCodes.InternalServerError).send(err);
    } else {
      res.status(statusCodes.Created).send(data);
    }
  });
});

app.get("/api/v1/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(statusCodes.InternalServerError).send(err);
    } else {
      res.status(statusCodes.OK).send(data);
    }
  });
});

//  Listen
app.listen(port, () => console.log(`Listening on localhost:${port}`));
