import * as fs from "fs";
import { join } from "path";
import wrtc from "@roamhq/wrtc";
import { Readable } from "stream";

type FrameEvent = {
  type: "frame";
  frame: {
    width: number;
    height: number;
    rotation: number;
    data: Uint8Array;
  };
};

export const parseRTCMediaStream = (
  track: wrtc.MediaStreamTrack,
  signal?: AbortSignal
) => {
  const sink = new wrtc.nonstandard.RTCVideoSink(track);
  const readable = new Readable({ read() {} });
  let didLogFirstFrame = false;

  const onFrame = (untypedEvent: unknown) => {
    const event = untypedEvent as FrameEvent;
    if (!didLogFirstFrame) {
      console.log("frame", event);
      didLogFirstFrame = true;
    }
    readable.push(event.frame.data);
  };
  const onEnd = () => {
    console.log("end", event);
    readable.push(null);
  };
  const onError = (event: Event) => {
    console.log("error", event);
    readable.push(null);
  };

  sink.addEventListener("frame", onFrame);
  sink.addEventListener("end", onEnd);
  sink.addEventListener("error", onError);
  if (signal) {
    signal.addEventListener("abort", () => {
      sink.removeEventListener("frame", onFrame);
      sink.removeEventListener("end", onEnd);
      sink.removeEventListener("error", onError);
      readable.push(null);
    });
  }
  return readable;
};

export const writeIncomingStreamToFile = (stream: wrtc.MediaStream) => {
  //   const inputDirectory = fs.mkdtempSync("input-");
  //   const inputPath = join(inputDirectory, "input.mp4");

  const framesStream = parseRTCMediaStream(stream);
  return new Promise((resolve, reject) => {
    framesStream.on("error", (error) => {
      reject(error);
    });
    framesStream.on("finish", () => {
      resolve();
    });
  });
};
