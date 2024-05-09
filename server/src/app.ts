import express from "express";
import { existsSync, readdirSync } from "fs";
import helmet from "helmet";
import http from "http";
import { join } from "path";
import { RTCEventMap } from "shared";
import { Server } from "socket.io";

import RTCHandler from "./rtc.js";

const app = express();
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

const server = http.createServer(app);
const io = new Server<RTCEventMap>(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true,
  },
});

app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/streams", (_, res) => {
  try {
    const streams = readdirSync("output")
      .map((dir) => `${dir}/master.m3u8`)
      .filter((file) => existsSync(join("output", file)));
    res.json({ status: "success", data: { streams } });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      res.json({ status: "success", data: { streams: [] } });
    } else {
      res.json({
        status: "error",
        error,
        message: (error instanceof Error && error.message) || "Unknown error",
      });
    }
  }
});

app.use("/streams", express.static("output"));

io.on("connection", (socket) => {
  new RTCHandler(socket);
});

io.on("error", (err) => {
  console.error(err);
});

app.get("/", (_, res) => {
  res.send("Hello World");
});

server.listen(3001, () => {
  console.log("Server is running on port 3001");
});
