"use strict";

import { PassThrough } from "stream";
import fs from "fs";

import wrtc from "@roamhq/wrtc";
const { RTCAudioSink, RTCVideoSink } = wrtc.nonstandard;

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { StreamInput } from "fluent-ffmpeg-multistream";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const VIDEO_OUTPUT_SIZE = "320x240";
const VIDEO_OUTPUT_FILE = "./recording.mp4";

let UID = 0;

type AudioDataEvent = {
  samples: Int16Array;
  bitsPerSample: number;
  sampleRate: number;
  channelCount: number;
  numberOfFrames: number;
  type: "data";
};

type VideoFrameEvent = {
  type: "frame";
  frame: {
    width: number;
    height: number;
    rotation: number;
    data: Uint8Array;
  };
};

type Stream = {
  recordPath: string;
  size: string;
  video: PassThrough;
  audio: PassThrough;
  end?: boolean;
  recordEnd?: boolean;
  proc?: ffmpeg.FfmpegCommand;
};

export type BeforeOfferOptions = {
  peerConnection: wrtc.RTCPeerConnection;
  videoTrack: wrtc.MediaStreamTrack;
  audioTrack: wrtc.MediaStreamTrack;
};

function beforeOffer({
  peerConnection,
  videoTrack,
  audioTrack,
}: BeforeOfferOptions) {
  const audioSink = new RTCAudioSink(audioTrack);
  const videoSink = new RTCVideoSink(videoTrack);

  const streams = [] as Stream[];

  let didLogFrame = false;

  videoSink.onframe = (untypedEvent: unknown) => {
    const {
      frame: { width, height, data },
    } = untypedEvent as VideoFrameEvent;
    if (!didLogFrame) {
      console.log("videoSink[frame]", event);
      didLogFrame = true;
    }

    const size = width + "x" + height;
    if (!streams[0] || (streams[0] && streams[0].size !== size)) {
      UID++;

      const stream: Stream = {
        recordPath: "./recording-" + size + "-" + UID + ".mp4",
        size,
        video: new PassThrough(),
        audio: new PassThrough(),
      };

      const onAudioData = (untypedEvent: unknown) => {
        const event = untypedEvent as AudioDataEvent;
        if (!stream.end) {
          stream.audio.push(Buffer.from(event.samples.buffer));
        }
      };

      audioSink.addEventListener("data", onAudioData);

      stream.audio.on("end", () => {
        audioSink.removeEventListener("data", onAudioData);
      });

      streams.unshift(stream);

      streams.forEach((item) => {
        if (item !== stream && !item.end) {
          item.end = true;
          if (item.audio) {
            item.audio.end();
          }
          item.video.end();
        }
      });

      stream.proc = ffmpeg()
        .addInput(new StreamInput(stream.video).url)
        .addInputOptions([
          "-f",
          "rawvideo",
          "-pix_fmt",
          "yuv420p",
          "-s",
          stream.size,
          "-r",
          "30",
        ])
        .addInput(new StreamInput(stream.audio).url)
        .addInputOptions(["-f s16le", "-ar 48k", "-ac 1"])
        .on("start", () => {
          console.log("Start recording >> ", stream.recordPath);
        })
        .on("end", () => {
          stream.recordEnd = true;
          console.log("Stop recording >> ", stream.recordPath);
        })
        .size(VIDEO_OUTPUT_SIZE)
        .output(stream.recordPath);

      stream.proc.run();
    }

    streams[0].video.push(Buffer.from(data));
  };

  const { close } = peerConnection;
  peerConnection.close = function () {
    console.log("close");
    audioSink.stop();
    videoSink.stop();

    streams.forEach(({ audio, video, end, proc, recordPath }) => {
      if (!end) {
        if (audio) {
          audio.end();
        }
        video.end();
      }
    });

    let totalEnd = 0;
    const timer = setInterval(() => {
      streams.forEach((stream) => {
        if (stream.recordEnd) {
          totalEnd++;
          if (totalEnd === streams.length) {
            clearTimeout(timer);

            const mergeProc = ffmpeg()
              .on("start", () => {
                console.log("Start merging into " + VIDEO_OUTPUT_FILE);
              })
              .on("end", () => {
                streams.forEach(({ recordPath }) => {
                  fs.unlinkSync(recordPath);
                });
                console.log("Merge end. You can play " + VIDEO_OUTPUT_FILE);
              });

            streams.forEach(({ recordPath }) => {
              mergeProc.addInput(recordPath);
            });

            mergeProc.output(VIDEO_OUTPUT_FILE).run();
          }
        }
      });
    }, 1000);

    return close.apply(this, arguments);
  };
}
export { beforeOffer };
