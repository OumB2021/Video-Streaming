"use client";

import { useEffect, useRef, useState } from "react";
import { SignalClient } from "./signal";

export default function Demo() {
  const [enable, setEnable] = useState<boolean | string>(false);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!enable) return;

    const rtc = new RTCPeerConnection();
    const signal = new SignalClient();
    let stream: MediaStream | null = null;
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
          .then(async (offer) => {
            await rtc.setLocalDescription(offer);
            signal.send("offer", offer);
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
        remoteVideo.srcObject = remoteStream as MediaProvider;
      }
    };

    rtc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to server", event.candidate);
        signal.send("iceCandidate", event.candidate);
      } else {
        console.log("All ICE candidates have been sent");
      }
    };

    signal.onmessage = (message) => {
      switch (message.type) {
        case "offer": {
          console.log("Received offer from server", message);
          rtc
            .setRemoteDescription(message.payload)
            .then(() => {
              console.log("Offer set as remote description successfully");
              return rtc.createAnswer();
            })
            .then(async (answer) => {
              console.log("Sending answer...");
              await rtc.setLocalDescription(answer);
              signal.send("answer", answer);
            })
            .catch((err) => {
              console.error("Failed to set remote description:", err);
            });
          break;
        }
        case "answer": {
          console.log("Received answer from server", message);
          rtc
            .setRemoteDescription(message.payload)
            .then(() => {
              console.log("Remote description set successfully");
            })
            .catch((err) => {
              console.error("Failed to set remote description:", err);
            });
          break;
        }
        case "iceCandidate": {
          if (!message.payload) {
            console.warn("Received empty ICE candidate from server");
            break;
          }
          console.log("Received ICE candidate from server", message);
          rtc
            .addIceCandidate(message.payload)
            .then(() => {
              console.log("ICE candidate added successfully");
            })
            .catch((err) => {
              console.error("Failed to add ICE candidate:", err);
            });
          break;
        }
      }
    };

    return () => {
      rtc.close();
      signal.close();
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
