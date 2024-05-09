"use client";

import { useWebRTC } from "./use-webrtc";

export default function Stream() {
  const {
    isActive,
    start,
    stop,
    localVideo,
    remoteVideo,
    signalStatus,
    rtcStatus,
  } = useWebRTC();

  return (
    <div>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <p>{JSON.stringify({ isActive, signalStatus, rtcStatus })}</p>
      <video ref={localVideo} autoPlay muted></video>
      <video ref={remoteVideo} autoPlay></video>
    </div>
  );
}
