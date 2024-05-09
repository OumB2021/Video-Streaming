import type { Socket } from "socket.io";
import wrtc from "@roamhq/wrtc";
import { RTCEventMap } from "shared";
import { StreamHandler, VideoFrameEvent } from "./ffmpeg.js";
import { join } from "path";
import * as fs from "fs";

export default class RTCHandler {
  private peerConnection = new wrtc.RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  private outputDir: string;
  private videoTrack?: wrtc.MediaStreamTrack;
  private audioTrack?: wrtc.MediaStreamTrack;
  private videoSink?: wrtc.nonstandard.RTCVideoSink;
  private audioSink?: wrtc.nonstandard.RTCAudioSink;
  private streamHandlers: StreamHandler[] = [];

  constructor(private readonly socket: Socket<RTCEventMap>) {
    this.attachSocketListeners();
    this.attachPeerConnectionListeners();

    this.outputDir = join(process.cwd(), "output", this.socket.id);
  }

  private attachSocketListeners() {
    this.socket.on("offer", async (offerInit) => {
      console.log(`[rtc][${this.socket.id}] offer received`);
      const offer = new wrtc.RTCSessionDescription(offerInit);
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log(`[rtc][${this.socket.id}] answer sent`);
      this.socket.emit("answer", answer);
    });
    this.socket.on("answer", async () => {
      console.warn(`[rtc][${this.socket.id}] unexpected answer received`);
    });
    this.socket.on("ice-candidate", (iceCandidateInit) => {
      console.log(`[rtc][${this.socket.id}] ice candidate via socket`);
      const iceCandidate = new wrtc.RTCIceCandidate(iceCandidateInit);
      this.peerConnection.addIceCandidate(iceCandidate);
    });
    this.socket.on("disconnect", () => {
      console.log(`[rtc][${this.socket.id}] disconnect`);
      if (this.peerConnection.connectionState === "connected") {
        this.peerConnection.close();
      }
    });
    this.socket.on("error", (error) => {
      console.error(`[rtc][${this.socket.id}] error:`, error);
    });
  }

  private attachPeerConnectionListeners() {
    this.peerConnection.onicecandidate = (event) => {
      console.log(
        `[rtc][${this.socket.id}] ice candidate via peer connection:`,
        event.candidate
      );
      if (event.candidate) {
        this.socket.emit("ice-candidate", event.candidate);
      }
    };
    this.peerConnection.onconnectionstatechange = () => {
      console.log(
        `[rtc][${this.socket.id}] connection state changed:`,
        this.peerConnection.connectionState
      );
    };
    this.peerConnection.ontrack = (event) => {
      console.log(`[rtc][${this.socket.id}] track received`);

      switch (event.track.kind) {
        case "video":
          this.videoTrack = event.track;
          break;
        case "audio":
          this.audioTrack = event.track;
          break;
      }

      if (this.videoTrack && this.audioTrack) {
        this.handleTranscoding({
          video: this.videoTrack,
          audio: this.audioTrack,
        });
      }
    };
  }

  private handleTranscoding({
    video,
    audio,
  }: {
    video: wrtc.MediaStreamTrack;
    audio: wrtc.MediaStreamTrack;
  }) {
    this.videoSink = new wrtc.nonstandard.RTCVideoSink(video);
    this.audioSink = new wrtc.nonstandard.RTCAudioSink(audio);

    fs.mkdirSync(this.outputDir, { recursive: true });

    this.videoSink.onframe = (event: VideoFrameEvent) => {
      this.handleFrame(event);
    };
  }

  private handleFrame(event: VideoFrameEvent) {
    if (!this.videoSink || !this.audioSink) {
      throw new Error(
        `[rtc][${this.socket.id}] missing audio and/or video sink`
      );
    }

    if (this.streamHandlers[0] && this.streamHandlers[0].isCompatible(event)) {
      this.streamHandlers[0].pushVideoFrame(event);
      return;
    }

    const streamHandler = new StreamHandler({
      event,
      outputPath: join(
        this.outputDir,
        `${this.streamHandlers.length}-stream-.m3u8`
      ),
      audioSink: this.audioSink,
    });

    console.log(
      `[rtc][${this.socket.id}] created stream handler ${this.streamHandlers.length} with size ${streamHandler.size}`
    );

    this.streamHandlers.forEach((handler) => {
      if (!handler.streamingEnded) {
        handler.end();
      }
    });

    this.streamHandlers.unshift(streamHandler);

    streamHandler.pushVideoFrame(event);
  }
}
