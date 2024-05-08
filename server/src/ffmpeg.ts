import ffmpeg from "fluent-ffmpeg";
import wrtc from "@roamhq/wrtc";
import { Readable, Stream } from "stream";
import * as fs from "fs";
import { exec } from "child_process";
import assert from "assert";
import { join } from "path";

function trackToStream(
  track: MediaStreamTrack,
  type: "video" | "audio"
): Readable {
  const readable = new Readable({
    read() {},
  });

  const source = new wrtc.nonstandard.RTCVideoSource();
  const sink =
    type === "video"
      ? new wrtc.nonstandard.RTCVideoSink(track)
      : new wrtc.nonstandard.RTCAudioSink(track);

  sink.addEventListener("frame", (event) => {
    // console.log("frame", event);
    readable.push(event.data);
  });

  sink.addEventListener("end", () => {
    readable.push(null);
  });

  return readable;
}

function makePromise<T>() {
  let resolve: ((value: T) => void) | undefined;
  let reject: ((reason: any) => void) | undefined;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  assert(resolve, "Missing resolve");
  assert(reject, "Missing reject");

  return { promise, resolve, reject };
}

export function processIncomingStreamToHLS(mediaStream: wrtc.MediaStream) {
  const videoTrack = mediaStream.getVideoTracks()[0];
  const audioTrack = mediaStream.getAudioTracks()[0];
  const { promise, resolve, reject } = makePromise<string>();

  const hlsDir = fs.mkdtempSync("hls-");

  const inputStream = trackToStream(videoTrack, "video");
  const inputStreamPath = join(process.cwd(), `${hlsDir}/input.mp4`);
  const inputStreamFile = fs.createWriteStream(inputStreamPath);

  inputStreamFile.on("ready", () => {
    console.log("inputStreamFile ready");
    inputStream
      .pipe(inputStreamFile)
      .on("error", (err) => {
        console.error("error", err);
      })
      .on("close", () => {
        console.log("inputStreamFile closed");
      });

    const command = `ffmpeg -i ${inputStreamPath} -c:v libx264 -c:a aac -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments ${hlsDir}/stream.m3u8`;
    exec(command, (err, stdout, stderr) => {
      console.log("[ffmpeg]", stdout);
      console.error("[ffmpeg]", stderr);
      if (err) {
        videoTrack.stop();
        audioTrack?.stop();
        fs.rmSync(hlsDir, { recursive: true });
        reject(err);
      }
      resolve(hlsDir);
    });
  });

  return promise;
  // const ffmpegCommand = ffmpeg()
  //   .input(trackToStream(videoTrack, "video"))
  //   .inputFormat("h264") // Specify input format if necessary
  //   .outputOptions([
  //     "-map 0", // Ensure the correct stream is selected
  //     "-f hls", // Output format
  //     "-hls_time 2", // Segment length
  //     "-hls_list_size 5", // Max amount of playlist entries
  //     "-hls_flags delete_segments", // Delete old segments
  //   ])
  //   .output(`${hlsDir}/stream.m3u8`);

  // if (audioTrack) {
  // ffmpegCommand
  //   .input(trackToStream(audioTrack, "audio"))
  //   .inputOptions("-i", "-")
  //   .outputOptions("-c:a", "aac");
  // }

  // return new Promise<string>((resolve, reject) => {
  //   ffmpegCommand.on("end", () => resolve(hlsDir));
  //   ffmpegCommand.on("error", (err) => {
  //     videoTrack.stop();
  //     audioTrack?.stop();
  //     fs.rmSync(hlsDir, { recursive: true });
  //     reject(err);
  //   });
  //   ffmpegCommand.on("close", (code) =>
  //     console.log(`FFmpeg exited with code ${code}`)
  //   );
  //   ffmpegCommand.run();
  // });

  // const videoStream = trackToStream(videoTrack, "video").pipe(tempStreamFile);
  // const ffmpegCommand = `ffmpeg -f rtp -i ${tempStreamFilePath} -c:v libx264 -stimeout -f flv rtmp://localhost/live/stream`;
  // exec(ffmpegCommand)
  //   .on("stdout", (data) => console.log(data))
  //   .on("stderr", (data) => console.error(data))
  //   .on("close", (code) => {
  //     console.log(`FFmpeg exited with code ${code}`);
  //   })
  //   .on("error", (err) => {
  //     console.error(`Error: ${err}`);
  //     fs.rmSync(hlsDir, { recursive: true });
  //   });
}
