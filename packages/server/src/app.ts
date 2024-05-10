import express from "express";
import { existsSync, readdirSync } from "fs";
import helmet from "helmet";
import http from "http";
import { join } from "path";
import { RTCEventMap } from "@video-streaming/shared";
import { Server } from "socket.io";

import RTCHandler from "./rtc.js";
import { db } from "@video-streaming/database";

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

io.of(/^\/stream\/.+$/).on("connection", (socket) => {
  console.log("Streamer connected", socket.nsp.name);
  const streamId = socket.nsp.name.split("/")[2];
  if (!streamId) {
    console.log("Stream ID is required");
    throw new Error("Stream ID is required");
  }
  const handler = new RTCHandler(socket, streamId);
  handler.onstart = async () => {
    console.log("Emitting to", `/watch/${streamId}`);
    io.of(`/watch/${streamId}`).emit("stream-started", "");
    await db.stream.update({
      where: { id: streamId },
      data: {
        isLive: true,
      },
    });
  };
  handler.onstop = async () => {
    console.log("Emitting to", `/watch/${streamId}`);
    io.of(`/watch/${streamId}`).emit("stream-ended", "");
    await db.stream.update({
      where: { id: streamId },
      data: {
        isLive: false,
      },
    });
  };
});

const connections = new Map<string, number>();

io.of(/^\/watch\/.+$/).on("connection", (socket) => {
  console.log("Viewer connected", socket.nsp.name);
  const streamId = socket.nsp.name.split("/")[2];
  if (!streamId) {
    console.log("Stream ID is required");
    throw new Error("Stream ID is required");
  }
  connections.set(streamId, (connections.get(streamId) || 0) + 1);
  io.of(socket.nsp.name).emit("viewer-count", connections.get(streamId));
  db.stream
    .findUnique({ where: { id: streamId } })
    .then((stream) => {
      socket.emit(stream?.isLive ? "stream-started" : "stream-ended", null);
    })
    .catch((error) => {
      console.error(error);
    });

  socket.on("disconnect", () => {
    console.log("Viewer disconnected", socket.nsp.name);
    connections.set(streamId, (connections.get(streamId) || 1) - 1);
    io.of(socket.nsp.name).emit("viewer-count", connections.get(streamId));
  });
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
