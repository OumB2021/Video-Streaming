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
import { mkdirSync, writeFileSync, createWriteStream } from "fs";
import { Writable } from "stream";
import { beforeOffer } from "./offer.js";

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

  let abortController = new AbortController();

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
    abortController.abort();
    console.log("a user disconnected");
  });

  let audioTrack: wrtc.MediaStreamTrack | undefined;
  let videoTrack: wrtc.MediaStreamTrack | undefined;

  rtc.ontrack = (event) => {
    console.log("track", event);
    if (event.track.kind === "video") {
      videoTrack = event.track;
    } else if (event.track.kind === "audio") {
      audioTrack = event.track;
    }
    if (videoTrack && audioTrack) {
      console.log("beforeOffer");
      beforeOffer({ peerConnection: rtc, videoTrack, audioTrack });
    }
  };

  // rtc.ontrack = (event) => {
  //   console.log("track", event.streams);
  //   console.log("Track received:", event.track.kind);
  //   if (event.track.kind !== "video") return;
  //   const src = parseRTCMediaStream(event.track, abortController.signal);
  //   console.log("track", event.track);
  //   const root = join(process.cwd(), "output");
  //   const outputPath = join(root, "output.yuv");

  //   // Set up FFmpeg to decode H.264 to raw video format
  //   const ffmpeg = spawn("ffmpeg", [
  //     "-i",
  //     "-", // Input from stdin
  //     "-f",
  //     "rtp", // Format of the input is RTP
  //     "-codec:v",
  //     "h264", // Specify H.264 as the video codec
  //     "-pix_fmt",
  //     "yuv420p", // Output pixel format
  //     "-f",
  //     "rawvideo", // Output file format
  //     "pipe:1", // Output to stdout
  //   ]);

  //   const outputStream = createWriteStream(outputPath);

  //   ffmpeg.stdin.setDefaultEncoding("binary");
  //   src.pipe(ffmpeg.stdin);
  //   ffmpeg.stdout.pipe(outputStream);
  //   ffmpeg.stderr.pipe(
  //     new Writable({
  //       write(chunk, encoding, callback) {
  //         console.error(chunk.toString("utf-8"));
  //         callback();
  //       },
  //     })
  //   );

  //   ffmpeg.on("close", () => {
  //     console.log("FFmpeg process ended.");
  //     outputStream.close();
  //   });

  //   ffmpeg.on("error", (err) => {
  //     console.error(err);
  //     abortController.abort();
  //     socket.disconnect();
  //   });
  // const ffmpegCommand = ffmpeg()
  //   .input(src) // videoSource is the stream from WebRTC
  //   .inputOptions([
  // "-f",
  // "rtp", // Format of the input is RTP
  // "-codec:v",
  // "h264", // Specify H.264 as the video codec
  //   ])
  //   // .inputOptions("-f", "rtp", "-codec:v", "libvpx") // Assuming VP8 codec
  // .outputOptions([
  //   "-pix_fmt",
  //   "yuv420p",
  //   "-c:v",
  //   "libx264",
  //   "-preset",
  //   "veryfast",
  //   "-f",
  //   "hls",
  //   "-hls_time",
  //   "4",
  //   "-hls_list_size",
  //   "0",
  // ])
  // .output(join(process.cwd(), "stream.m3u8"))
  // .on("start", (commandLine) =>
  //   console.log(`Spawned Ffmpeg with command: ${commandLine}`)
  // )
  // .on("codecData", (data) =>
  //   console.log(`Input is ${data.video} video with ${data.audio} audio`)
  // )
  // .on("error", (err) => {
  //   console.log(`Error: ${err.message}`);
  //   abortController.abort();
  // })
  // .on("end", () => console.log("Transcoding finished"))
  // .run();
  // };
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
