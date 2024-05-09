"use strict";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import wrtc from "@roamhq/wrtc";
import ffmpeg from "fluent-ffmpeg";
import { StreamInput } from "fluent-ffmpeg-multistream";
import { join } from "path";
import { PassThrough } from "stream";
import { existsSync, mkdirSync, writeFileSync } from "fs";

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

const formatOptions = (options: Record<string, string | number>) => {
  return Object.entries(options).map(([key, value]) => `-${key} ${value}`);
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

    const defaultOptions = {
      preset: "veryfast",
      sc_threshold: 0,
      g: 48,
      hls_time: 2,
      hls_list_size: 10,
      start_number: currentSegmentIndex,
      hls_flags: "delete_segments+append_list",
    };

    const resolutionsOptions = {
      1920: {
        crf: 20,
        "b:v": "4500k",
        "b:a": "128k",
        maxrate: "6750k",
        bufsize: "13500k",
      },
      1280: {
        crf: 22,
        "b:v": "2500k",
        "b:a": "128k",
        maxrate: "4500k",
        bufsize: "7500k",
      },
      960: {
        crf: 24,
        "b:v": "1500k",
        "b:a": "128k",
        maxrate: "3000k",
        bufsize: "6000k",
      },
      640: {
        crf: 26,
        "b:v": "1000k",
        "b:a": "128k",
        maxrate: "2000k",
        bufsize: "4000k",
      },
      320: {
        crf: 28,
        "b:v": "500k",
        "b:a": "128k",
        maxrate: "1000k",
        bufsize: "2000k",
      },
    };

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
      .videoCodec("libx264")
      .audioCodec("aac");

    for (const [resolution, resolutionOptions] of Object.entries(
      resolutionsOptions,
    )) {
      const resolutionPath = join(output, resolution);
      if (!existsSync(resolutionPath)) {
        mkdirSync(resolutionPath);
      }

      const options = formatOptions({
        ...defaultOptions,
        ...resolutionOptions,
        hls_segment_filename: join(resolutionPath, "segment-%03d.ts"),
      });
      command
        .output(join(resolutionPath, "index.m3u8"))
        .size(`${resolution}x?`)
        .outputOptions(options);
    }

    writeFileSync(
      join(output, "master.m3u8"),
      [
        "#EXTM3U",
        ...Object.entries(resolutionsOptions).map(
          ([resolution, resolutionOptions]) =>
            `#EXT-X-STREAM-INF:BANDWIDTH=${resolutionOptions["b:v"].slice(
              0,
              -1,
            )}000,RESOLUTION=${resolution}x?\n${resolution}/index.m3u8`,
        ),
      ].join("\n"),
    );

    command
      .on("start", () => {
        console.log("[ffmpeg] Start recording >> ", output);
      })
      .on("stdout", (data) => {
        console.log("[ffmpeg] stdout", data);
      })
      .on("stderr", (data) => {
        console.error("[ffmpeg] stderr", data);
      })
      .on("end", () => {
        this.processingEnded = true;
        console.log("[ffmpeg] Stop recording >> ", output);
      })
      .run();

    this.path = output;
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
