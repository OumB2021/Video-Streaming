"use strict";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import wrtc from "@roamhq/wrtc";
import ffmpeg from "fluent-ffmpeg";
import { StreamInput } from "fluent-ffmpeg-multistream";
import { join } from "path";
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
    output,
    audioSink,
    currentSegmentIndex,
  }: {
    event: VideoFrameEvent;
    output: string;
    audioSink: wrtc.nonstandard.RTCAudioSink;
    currentSegmentIndex: number;
  }) {
    const {
      frame: { width, height },
    } = event;
    this.size = width + "x" + height;

    this.attachAudioSink(audioSink);

    const m3u8Path = join(output, "stream.m3u8");

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
        "-hls_time 2", // Duration of each segment
        "-hls_list_size 0", // Max number of playlist entries
        `-start_number ${currentSegmentIndex}`, // Resume segment number at given index
        `-hls_segment_filename ${join(output, "segment-%03d.ts")}`, // Name of the segment file
        "-hls_flags append_list", // Delete segments older than playlist
      ])
      .on("start", () => {
        console.log("[ffmpeg] Start recording >> ", m3u8Path);
      })
      .on("stdout", (data) => {
        console.log("[ffmpeg] stdout", data);
      })
      .on("stderr", (data) => {
        console.error("[ffmpeg] stderr", data);
      })
      .on("end", () => {
        this.processingEnded = true;
        console.log("[ffmpeg] Stop recording >> ", m3u8Path);
      })
      .output(m3u8Path);

    command.run();

    this.path = m3u8Path;
  }

  isCompatible(event: VideoFrameEvent) {
    return this.size === event.frame.width + "x" + event.frame.height;
  }

  pushVideoFrame(event: VideoFrameEvent | null) {
    if (event) {
      this.video.push(Buffer.from(event.frame.data));
    } else {
      this.video.push(null);
    }
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
