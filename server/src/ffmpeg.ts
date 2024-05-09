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
      // crf: 23,
      sc_threshold: 0,
      g: 48,
      // "b:v": "800k",
      // "b:a": "128k",
      // maxrate: "856k",
      // bufsize: "1200k",
      hls_time: 2,
      hls_list_size: 10,
      start_number: currentSegmentIndex,
      hls_segment_filename: join(output, "segment-1920-%03d.ts"),
      hls_flags: "delete_segments+append_list",
    };

    const resolutionsOptions = {
      1920: {
        crf: 20,
        "b:v": "4500k",
        "b:a": "128k",
        maxrate: "6750k",
        bufsize: "13500k",
        hls_segment_filename: join(output, "segment-1920-%03d.ts"),
      },
      1280: {
        crf: 22,
        "b:v": "2500k",
        "b:a": "128k",
        maxrate: "4500k",
        bufsize: "7500k",
        hls_segment_filename: join(output, "segment-1280-%03d.ts"),
      },
      960: {
        crf: 24,
        "b:v": "1500k",
        "b:a": "128k",
        maxrate: "3000k",
        bufsize: "6000k",
        hls_segment_filename: join(output, "segment-960-%03d.ts"),
      },
      640: {
        crf: 26,
        "b:v": "1000k",
        "b:a": "128k",
        maxrate: "2000k",
        bufsize: "4000k",
        hls_segment_filename: join(output, "segment-640-%03d.ts"),
      },
      320: {
        crf: 28,
        "b:v": "500k",
        "b:a": "128k",
        maxrate: "1000k",
        bufsize: "2000k",
        hls_segment_filename: join(output, "segment-320-%03d.ts"),
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
      .videoCodec("libx264") // Video codec for output
      .audioCodec("aac"); // Audio codec for output

    console.log(formatOptions(defaultOptions));

    for (const [resolution, resolutionOptions] of Object.entries(resolutionsOptions)) {
      const options = formatOptions({
        ...defaultOptions,
        ...resolutionOptions,
      });
      command
        .output(join(output, `${resolution}.m3u8`))
        .size(`${resolution}x?`)
        .outputOptions(options);
    }

    // .output(join(output, "stream-1920.m3u8"))
    // .size("1920x?") // Scale video to width of 1920 pixels, maintain aspect ratio
    // .outputOptions([
    //   "-preset veryfast", // Fast encoding
    //   "-crf 23", // Constant rate factor for quality
    //   "-sc_threshold 0", // Scene change threshold (set to 0 for continuous scenes)
    //   "-g 48", // Keyframe interval
    //   "-b:v 800k", // Video bitrate
    //   "-b:a 128k", // Audio bitrate
    //   "-maxrate 856k", // Max bitrate
    //   "-bufsize 1200k", // Buffer size
    //   "-hls_time 2", // Duration of each segment
    //   "-hls_list_size 10", // Max number of playlist entries
    //   `-start_number ${currentSegmentIndex}`, // Resume segment number at given index
    //   `-hls_segment_filename ${join(output, "segment-1920-%03d.ts")}`, // Name of the segment file
    //   "-hls_flags delete_segments+append_list", // Delete segments older than playlist
    // ])
    // .output(join(output, "stream-1280.m3u8"))
    // .size("1280x?") // Scale video to width of 1280 pixels, maintain aspect ratio
    // .outputOptions([
    //   "-preset veryfast", // Fast encoding
    //   "-crf 23", // Constant rate factor for quality
    //   "-sc_threshold 0", // Scene change threshold (set to 0 for continuous scenes)
    //   "-g 48", // Keyframe interval
    //   "-b:v 800k", // Video bitrate
    //   "-b:a 128k", // Audio bitrate
    //   "-maxrate 856k", // Max bitrate
    //   "-bufsize 1200k", // Buffer size
    //   "-hls_time 2", // Duration of each segment
    //   "-hls_list_size 10", // Max number of playlist entries
    //   `-start_number ${currentSegmentIndex}`, // Resume segment number at given index
    //   `-hls_segment_filename ${join(output, "segment-1280-%03d.ts")}`, // Name of the segment file
    //   "-hls_flags delete_segments+append_list", // Delete segments older than playlist
    // ])
    // .size("640x?")
    // .output(join(output, "stream-640.m3u8"))
    // .outputOptions([
    //   "-preset veryfast", // Fast encoding
    //   "-crf 23", // Constant rate factor for quality
    //   "-sc_threshold 0", // Scene change threshold (set to 0 for continuous scenes)
    //   "-g 48", // Keyframe interval
    //   "-b:v 800k", // Video bitrate
    //   "-b:a 128k", // Audio bitrate
    //   "-maxrate 856k", // Max bitrate
    //   "-bufsize 1200k", // Buffer size
    //   "-hls_time 2", // Duration of each segment
    //   "-hls_list_size 10", // Max number of playlist entries
    //   `-start_number ${currentSegmentIndex}`, // Resume segment number at given index
    //   `-hls_segment_filename ${join(output, "segment-640-%03d.ts")}`, // Name of the segment file
    //   "-hls_flags delete_segments+append_list", // Delete segments older than playlist
    // ])
    // .size("320x?")
    // .output(join(output, "stream-320.m3u8"))
    // .outputOptions([
    //   "-preset veryfast", // Fast encoding
    //   "-crf 23", // Constant rate factor for quality
    //   "-sc_threshold 0", // Scene change threshold (set to 0 for continuous scenes)
    //   "-g 48", // Keyframe interval
    //   "-b:v 800k", // Video bitrate
    //   "-b:a 128k", // Audio bitrate
    //   "-maxrate 856k", // Max bitrate
    //   "-bufsize 1200k", // Buffer size
    //   "-hls_time 2", // Duration of each segment
    //   "-hls_list_size 10", // Max number of playlist entries
    //   `-start_number ${currentSegmentIndex}`, // Resume segment number at given index
    //   `-hls_segment_filename ${join(output, "segment-320-%03d.ts")}`, // Name of the segment file
    //   "-hls_flags delete_segments+append_list", // Delete segments older than playlist
    // ])
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
