import express from "express";
import { readdirSync } from "fs";
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
  })
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

app.get("/list", (req, res) => {
  const files = readdirSync("output")
    .map((dir) =>
      readdirSync(join("output", dir))
        .filter((file) => file.endsWith(".m3u8"))
        .map((file) => join(dir, file))
    )
    .flat();
  console.log(files);
  res.json(files);
});

app.use("/watch", express.static("output"));

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
