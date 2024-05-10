import wrtc from "@roamhq/wrtc";
import { RTCEventMap } from "@video-streaming/shared";
import * as fs from "fs";
import { join } from "path";
import type { Socket } from "socket.io";
import { StreamHandler, VideoFrameEvent } from "./ffmpeg.js";

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

  onstart?: () => void;
  onstop?: () => void;

  constructor(
    private readonly socket: Socket<RTCEventMap>,
    private readonly streamId: string
  ) {
    this.attachSocketListeners();
    this.attachPeerConnectionListeners();

    this.outputDir = join(process.cwd(), "output", this.streamId);
  }

  private attachSocketListeners() {
    this.socket.on("offer", async (offerInit) => {
      console.log(`[rtc][${this.streamId}] offer received`);
      const offer = new wrtc.RTCSessionDescription(offerInit);
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log(`[rtc][${this.streamId}] answer sent`);
      this.socket.emit("answer", answer);
    });

    this.socket.on("answer", async () => {
      console.warn(`[rtc][${this.streamId}] unexpected answer received`);
    });

    this.socket.on("ice-candidate", (iceCandidateInit) => {
      console.log(`[rtc][${this.streamId}] ice candidate via socket`);
      const iceCandidate = new wrtc.RTCIceCandidate(iceCandidateInit);
      this.peerConnection.addIceCandidate(iceCandidate);
    });

    this.socket.on("disconnect", () => {
      console.log(`[rtc][${this.streamId}] disconnect`);
      if (this.peerConnection.connectionState === "connected") {
        this.peerConnection.close();
      }
      this.endStream();
    });

    this.socket.on("error", (error) => {
      console.error(`[rtc][${this.streamId}] error:`, error);
    });
  }

  private attachPeerConnectionListeners() {
    this.peerConnection.onicecandidate = (event) => {
      console.log(
        `[rtc][${this.streamId}] ice candidate via peer connection:`,
        event.candidate
      );
      if (event.candidate) {
        this.socket.emit("ice-candidate", event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log(
        `[rtc][${this.streamId}] connection state changed:`,
        this.peerConnection.connectionState
      );
    };

    this.peerConnection.ontrack = (event) => {
      console.log(`[rtc][${this.streamId}] track received`);

      switch (event.track.kind) {
        case "video":
          this.videoTrack = event.track;
          break;
        case "audio":
          this.audioTrack = event.track;
          break;
      }

      // Initialize transcoding if the tracks are available.
      // The sinks are checked to ensure we don't initialize transcoding twice.
      if (
        this.videoTrack &&
        this.audioTrack &&
        !this.videoSink &&
        !this.audioSink
      ) {
        this.onstart?.();
        this.initializeTranscoding({
          video: this.videoTrack,
          audio: this.audioTrack,
        });
      }
    };
  }

  private initializeTranscoding({
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
        `[rtc][${this.streamId}] missing audio and/or video sink`
      );
    }

    if (this.streamHandlers[0] && this.streamHandlers[0].isCompatible(event)) {
      this.streamHandlers[0].pushVideoFrame(event);
      return;
    }

    const segmentFileCount = fs
      .readdirSync(this.outputDir)
      .filter((file) => file.endsWith(".ts")).length;

    const streamHandler = new StreamHandler({
      event,
      output: this.outputDir,
      audioSink: this.audioSink,
      currentSegmentIndex: segmentFileCount,
    });

    console.log(
      `[rtc][${this.streamId}] created stream handler ${this.streamHandlers.length} with size ${streamHandler.size}, resuming at ${segmentFileCount}`
    );

    this.streamHandlers.forEach((handler) => {
      if (!handler.streamingEnded) {
        handler.end();
      }
    });

    this.streamHandlers.unshift(streamHandler);

    streamHandler.pushVideoFrame(event);
  }

  private endStream() {
    if (this.streamHandlers[0] && !this.streamHandlers[0].streamingEnded) {
      this.streamHandlers[0].pushVideoFrame(null);
      this.onstop?.();
    }
  }
}
