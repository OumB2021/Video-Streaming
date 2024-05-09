"use strict";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import wrtc from "@roamhq/wrtc";
import ffmpeg from "fluent-ffmpeg";
import { StreamInput } from "fluent-ffmpeg-multistream";
import { PassThrough } from "stream";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export type AudioDataEvent = {
  samples: Int16Array;
  bitsPerSample: number;
  sampleRate: number;
  channelCount: number;
  numberOfFrames: number;
  type: "data";
};

export type VideoFrameEvent = {
  type: "frame";
  frame: {
    width: number;
    height: number;
    rotation: number;
    data: Uint8Array;
  };
};

export type BeforeOfferOptions = {
  peerConnection: wrtc.RTCPeerConnection;
  videoTrack: wrtc.MediaStreamTrack;
  audioTrack: wrtc.MediaStreamTrack;
};

export class StreamHandler {
  path: string;
  size: string;
  private video = new PassThrough();
  private audio = new PassThrough();

  streamingEnded = false;
  processingEnded = false;

  constructor({
    event,
    outputPath,
    audioSink,
  }: {
    event: VideoFrameEvent;
    outputPath: string;
    audioSink: wrtc.nonstandard.RTCAudioSink;
  }) {
    const {
      frame: { width, height },
    } = event;
    this.size = width + "x" + height;

    this.attachAudioSink(audioSink);

    const command = ffmpeg()
      .addInput(new StreamInput(this.video).url)
      .inputFormat("rawvideo")
      .addInputOptions([
        "-f rawvideo",
        "-pix_fmt yuv420p",
        "-r 30",
        `-s ${this.size}`,
      ])
      .addInput(new StreamInput(this.audio).url)
      .addInputOptions(["-f s16le", "-ar 48k", "-ac 1"])
      .videoCodec("libx264") // Video codec for output
      .audioCodec("aac") // Audio codec for output
      .size("1280x?") // Scale video to width of 1280 pixels, maintain aspect ratio
      .outputOptions([
        "-preset veryfast", // Fast encoding
        "-crf 23", // Constant rate factor for quality
        "-sc_threshold 0", // Scene change threshold (set to 0 for continuous scenes)
        "-g 48", // Keyframe interval
        "-b:v 800k", // Video bitrate
        "-b:a 128k", // Audio bitrate
        "-maxrate 856k", // Max bitrate
        "-bufsize 1200k", // Buffer size
        "-hls_time 4", // Duration of each segment
        "-hls_list_size 0", // Max number of playlist entries
        "-hls_flags delete_segments", // Delete segments older than playlist
      ])
      .on("start", () => {
        console.log("Start recording >> ", outputPath);
      })
      .on("end", () => {
        this.processingEnded = true;
        console.log("Stop recording >> ", outputPath);
      })
      .output(outputPath);

    command.run();

    this.path = outputPath;
  }

  isCompatible(event: VideoFrameEvent) {
    return this.size === event.frame.width + "x" + event.frame.height;
  }

  pushVideoFrame(event: VideoFrameEvent) {
    this.video.push(Buffer.from(event.frame.data));
  }

  end() {
    this.audio.end();
    this.video.end();
    this.streamingEnded = true;
  }

  private attachAudioSink(audioSink: wrtc.nonstandard.RTCAudioSink) {
    const handleAudioData = (untypedEvent: unknown) => {
      const event = untypedEvent as AudioDataEvent;
      if (!this.streamingEnded) {
        this.audio.push(Buffer.from(event.samples.buffer));
      }
    };

    audioSink.addEventListener("data", handleAudioData);

    this.audio.on("end", () => {
      audioSink.removeEventListener("data", handleAudioData);
    });
  }
}
