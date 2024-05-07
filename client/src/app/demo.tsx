"use client";

import { useRTC } from "./use-rtc";

export default function Demo() {
  const rtc = useRTC();

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative aspect-video w-full max-w-lg rounded bg-gray-800">
        <video
          className="h-full w-full object-cover"
          ref={rtc.remoteVideo}
          autoPlay
        />
        <div className="absolute bottom-2.5 right-2.5">
          <div className="w-full max-w-36 rounded bg-gray-600">
            <video
              className="h-full w-full object-cover"
              ref={rtc.localVideo}
              autoPlay
            />
          </div>
        </div>
      </div>
      {rtc.isActive ? (
        <div className="mt-4 text-center">
          <div className="flex">
            <div>
              <span className="font-bold">Signal Status:</span>
              <span className="ml-2">{rtc.signalStatus}</span>
            </div>
            <div>
              <span className="font-bold">RTC Status:</span>
              <span className="ml-2">{rtc.rtcStatus}</span>
            </div>
          </div>
          <button
            className="mx-auto mt-4 block rounded bg-red-500 px-4 py-2 text-white"
            onClick={rtc.stop}
          >
            Stop
          </button>
        </div>
      ) : (
        <div className="mt-4 flex">
          <button
            className="mx-auto mt-4 block rounded bg-green-500 px-4 py-2 text-white"
            onClick={rtc.start}
          >
            Start
          </button>
        </div>
      )}
    </div>
  );
}
