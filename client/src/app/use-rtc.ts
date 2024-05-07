import { useEffect, useRef, useState } from "react";
import { SignalClient } from "./signal";

export function useRTC() {
  const [isActive, setIsActive] = useState(false);

  const [signalStatus, setSignalStatus] = useState<
    "idle" | "connecting" | "connected"
  >("idle");
  const [rtcStatus, setRtcStatus] = useState<RTCIceConnectionState>("new");

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isActive) return;

    let other: string | null = null;

    const signal = new SignalClient();
    const rtc = new RTCPeerConnection();
    let localStream: MediaStream | null = null;

    const connect = async () => {
      setSignalStatus("connecting");

      await signal.connected().catch(() => {
        throw new Error("Failed to connect to server");
      });

      signal.onmessage = (message) => {
        switch (message.type) {
          case "joined": {
            other = message.src;
            console.log("Peer joined:", other);
            break;
          }
          case "left": {
            other = null;
            remoteVideo.current!.srcObject = null;
            break;
          }
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

      setSignalStatus("connected");

      rtc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        remoteVideo.current!.srcObject = remoteStream as MediaProvider;
      };
      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          signal.send("iceCandidate", event.candidate);
        }
      };
      rtc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", rtc.iceConnectionState);
        setRtcStatus(rtc.iceConnectionState);
        if (rtc.iceConnectionState === "disconnected") {
          setIsActive(false);
          close();
        }
      };
      rtc.onicecandidateerror = (event) => {
        console.error("ICE candidate error:", event);
      };
      //   rtc.onnegotiationneeded = async () => {
      //     try {
      //       const offer = await rtc.createOffer();
      //       await rtc.setLocalDescription(offer);
      //       signal.send("offer", offer);
      //     } catch (error) {
      //       console.error(error);
      //     }
      //   };

      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStream
        .getTracks()
        .forEach((track) => rtc.addTrack(track, localStream!));
      localVideo.current!.srcObject = localStream as MediaProvider;
      
      rtc
        .createOffer()
        .then(async (offer) => {
          await rtc.setLocalDescription(offer);
          signal.send("offer", offer);
          console.log("Offer sent to peer", other);
        })
        .catch((err) => {
          console.error("Failed to create offer:", err);
        });
    };

    const close = () => {
      setSignalStatus("idle");
      setRtcStatus("new");
      signal.close();
      rtc.close();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      localVideo.current!.srcObject = null;
      remoteVideo.current!.srcObject = null;
    };

    connect().catch((error) => {
      console.error(error);
      close();
    });

    return close;
  }, [isActive]);

  const start = () => setIsActive(true);
  const stop = () => setIsActive(false);

  return {
    isActive,
    start,
    stop,
    localVideo,
    remoteVideo,
    signalStatus,
    rtcStatus,
  };
}
