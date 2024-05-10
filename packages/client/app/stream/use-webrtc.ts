import { useEffect, useRef, useState } from "react";
import { RTCEventMap } from "@video-streaming/shared";
import { Socket, io } from "socket.io-client";
import { toast } from "sonner";

export function useWebRTC(streamId: string) {
  const [isActive, setIsActive] = useState(false);

  const [signalStatus, setSignalStatus] = useState<
    "idle" | "connecting" | "connected"
  >("idle");
  const [rtcStatus, setRtcStatus] = useState<RTCIceConnectionState>("new");

  const localVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isActive) return;

    let other: string | null = null;

    const socket = io(
      `ws://localhost:3001/stream/${streamId}`
    ) as Socket<RTCEventMap>;
    const rtc = new RTCPeerConnection();
    let localStream: MediaStream | null = null;

    const connect = async () => {
      setSignalStatus("connecting");

      await new Promise<void>((resolve, reject) => {
        socket.on("connect", () => {
          resolve();
        });
        socket.on("connect_error", (error) => {
          reject(new Error("Failed to connect to server: " + error));
        });
      });

      socket.on("offer", (offer) => {
        console.log("Received offer from server", offer);
      });

      socket.on("answer", (answer) => {
        console.log("Received answer from server", answer);
        rtc.setRemoteDescription(answer);
      });

      socket.on("ice-candidate", (candidate) => {
        console.log("Received candidate from server", candidate);
        rtc.addIceCandidate(candidate);
      });

      socket.on("disconnect", () => {
        console.log("Received close from server");
        close();
      });

      setSignalStatus("connected");

      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", event.candidate);
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
          socket.emit("offer", offer);
          console.log("Offer sent to peer", other);
        })
        .catch((err) => {
          console.error("Failed to create offer:", err);
        });
    };
    const close = () => {
      setSignalStatus("idle");
      setRtcStatus("new");
      socket.close();
      rtc.close();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      localVideo.current!.srcObject = null;
      setIsActive(false);
    };

    connect().catch((error) => {
      console.error(error);
      toast.error("Failed to start streaming", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      setIsActive(false);
      close();
    });

    return close;
  }, [isActive, streamId]);

  const start = () => setIsActive(true);
  const stop = () => setIsActive(false);

  return {
    isActive,
    start,
    stop,
    localVideo,
    signalStatus,
    rtcStatus,
  };
}
