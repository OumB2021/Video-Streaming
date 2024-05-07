import http from "http";
import express from "express";
import { Server } from "socket.io";
import helmet from "helmet";
import { RTCEventMap } from "shared";
import wrtc from "@roamhq/wrtc";

console.log(wrtc);

const app = express();
app.use(
  helmet({ crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false })
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

io.on("connection", (socket) => {
  console.log("a user connected");

  const rtc = new wrtc.RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  rtc.onicecandidate = (event) => {
    console.log("server ice candidate", JSON.stringify(event).slice(0, 100));
    if (!event.candidate) return;
    socket.emit("candidate", event.candidate);
  };

  socket.on("offer", (event) => {
    console.log("offer", JSON.stringify(event).slice(0, 100));

    const offer = new wrtc.RTCSessionDescription({
      type: "offer",
      sdp: event.sdp,
    });
    rtc
      .setRemoteDescription(offer)
      .then(async () => {
        const answer = await rtc.createAnswer();
        await rtc.setLocalDescription(answer);
        socket.emit("answer", {
          type: "answer",
          sdp: answer.sdp,
        });
      })
      .catch((err) => {
        console.error(err);
      });
  });

  socket.on("candidate", (event) => {
    console.log("client ice candidate", JSON.stringify(event).slice(0, 100));

    rtc.addIceCandidate(new wrtc.RTCIceCandidate(event));
  });

  socket.on("answer", (event) => {
    console.log("answer", JSON.stringify(event).slice(0, 100));
  });

  socket.on("disconnect", () => {
    console.log("a user disconnected");
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
