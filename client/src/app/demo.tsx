"use client";
import { useEffect, useRef, useState } from "react";

export default function Demo() {
  const [enable, setEnable] = useState<boolean | string>(false);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!enable) return;

    let id: string | null = null;
    const rtc = new RTCPeerConnection();
    let stream: MediaStream | null = null;
    const ws = new WebSocket("ws://localhost:3001/api/ws");
    const remoteVideo = remoteVideoRef.current;
    const localVideo = localVideoRef.current;

    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then(async (newStream) => {
        stream = newStream;
        if (localVideo) {
          localVideo.srcObject = stream;
        }

        newStream
          .getTracks()
          .forEach((track) => rtc.addTrack(track, newStream));

        rtc
          .createOffer()
          .then((offer) => {
            rtc.setLocalDescription(offer);
            ws.send(
              JSON.stringify({
                src: id,
                type: "offer",
                payload: offer,
              }),
            );
          })
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });

    rtc.ontrack = (event) => {
      // Handle incoming media tracks
      const remoteStream = event.streams[0];
      // Display the remote stream in a video element
      if (remoteVideo) {
        remoteVideo.srcObject = remoteStream;
      }
    };

    // Add event listeners for ICE candidates and track events
    rtc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to server", event.candidate);
        ws.send(
          JSON.stringify({
            src: id,
            type: "iceCandidate",
            payload: event.candidate,
          }),
        );
      } else {
        console.log("All ICE candidates have been sent");
      }
    };

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data) as
        | { src: "server"; type: "id"; payload: string }
        | { src: string; type: "offer"; payload: RTCSessionDescriptionInit }
        | { src: string; type: "answer"; payload: RTCSessionDescriptionInit }
        | { src: string; type: "iceCandidate"; payload: RTCIceCandidateInit };

      switch (data.type) {
        case "id":
          console.log("Connected to server with ID:", data.payload);
          id = data.payload;

          break;
        case "offer":
          console.log("Received offer from server", data);
          rtc.setRemoteDescription(data.payload);
          rtc.createAnswer().then((answer) => {
            rtc.setLocalDescription(answer);
            ws.send(
              JSON.stringify({
                src: id,
                type: "answer",
                payload: answer,
              }),
            );
          });
          break;
        case "answer":
          if (!data.payload) {
            console.warn("Received empty answer from server");
            break;
          }
          console.log("Received answer from server", data);
          rtc.setRemoteDescription(data.payload);
          break;
        case "iceCandidate":
          if (!data.payload) {
            console.warn("Received empty ICE candidate from server");
            break;
          }
          console.log("Received ICE candidate from server", data);
          rtc.addIceCandidate(data.payload);
          break;
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setEnable(false);
    };

    return () => {
      rtc.close();
      ws.close();
      stream?.getTracks().forEach((track) => {
        track.stop();
      });
      if (localVideo) {
        localVideo.srcObject = null;
      }
    };
  }, [enable]);

  return (
    <div className="">
      <div className="flex items-center justify-center">
        <div className="aspect-video w-full max-w-sm bg-gray-500">
          <h2>Remote Video</h2>
          <video
            className={`h-full w-full object-cover`}
            ref={remoteVideoRef}
            autoPlay
          />
        </div>
        <div className="aspect-video w-full max-w-sm bg-gray-500">
          <h2>Local Video</h2>
          <video
            className={`h-full w-full object-cover`}
            ref={localVideoRef}
            autoPlay
          />
        </div>
      </div>
      {enable && (
        <div className="mt-4 text-center">
          <p>WebRTC connection enabled</p>
          <button
            className="mx-auto mt-4 block rounded bg-red-500 px-4 py-2 text-white"
            onClick={() => setEnable(false)}
          >
            Stop
          </button>
        </div>
      )}
      {!enable && (
        <div className="mt-4 flex">
          <button
            className="mx-auto mt-4 block rounded bg-green-500 px-4 py-2 text-white"
            onClick={() => setEnable(true)}
          >
            Start
          </button>
        </div>
      )}
    </div>
  );
}
