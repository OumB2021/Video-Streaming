import http from "http";
import express from "express";
import { Server } from "socket.io";
import helmet from "helmet";
import { RTCEventMap } from "shared";
import wrtc from "@roamhq/wrtc";
import { processIncomingStreamToHLS } from "./ffmpeg";
import {
  parseRTCMediaStream,
  writeIncomingStreamToFile,
} from "./handle-incoming-stream.js";
import ffmpeg from "fluent-ffmpeg";
import { join } from "path";
import { exec, spawn } from "child_process";
import { mkdirSync, writeFileSync, createWriteStream, readdirSync } from "fs";
import { Writable } from "stream";
import { beforeOffer } from "./ffmpeg.js";
import RTCHandler from "./handler.js";

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

app.use((req, res, next) => {
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
  const handler = new RTCHandler(socket);
});

// io.on("connection", (socket) => {
//   console.log("a user connected", socket.id);

//   const peerConnection = new wrtc.RTCPeerConnection({
//     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//   });

//   peerConnection.onicecandidate = (event) => {
//     console.log("server ice candidate", JSON.stringify(event).slice(0, 100));
//     if (!event.candidate) return;
//     socket.emit("candidate", event.candidate);
//   };

//   socket.on("offer", (event) => {
//     console.log("offer", JSON.stringify(event).slice(0, 100));

//     const offer = new wrtc.RTCSessionDescription({
//       type: "offer",
//       sdp: event.sdp,
//     });

//     peerConnection
//       .setRemoteDescription(offer)
//       .then(async () => {
//         const answer = await peerConnection.createAnswer();
//         await peerConnection.setLocalDescription(answer);
//         socket.emit("answer", {
//           type: "answer",
//           sdp: answer.sdp,
//         });
//       })
//       .catch((err) => {
//         console.error(err);
//       });
//   });

//   socket.on("candidate", (event) => {
//     console.log("client ice candidate", JSON.stringify(event).slice(0, 100));

//     peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(event));
//   });

//   socket.on("answer", (event) => {
//     console.log("answer", JSON.stringify(event).slice(0, 100));
//   });

//   socket.on("disconnect", () => {
//     console.log("a user disconnected");
//     peerConnection.close();
//   });

//   let audioTrack: wrtc.MediaStreamTrack | undefined;
//   let videoTrack: wrtc.MediaStreamTrack | undefined;

//   peerConnection.ontrack = (event) => {
//     console.log("track", event);
//     if (event.track.kind === "video") {
//       videoTrack = event.track;
//     } else if (event.track.kind === "audio") {
//       audioTrack = event.track;
//     }
//     if (videoTrack && audioTrack) {
//       beforeOffer({ peerConnection, videoTrack, audioTrack });
//     }
//   };
// });

io.on("error", (err) => {
  console.error(err);
});

app.get("/", (_, res) => {
  res.send("Hello World");
});

app.use(express.static("recordings"));

server.listen(3001, () => {
  console.log("Server is running on port 3001");
});
