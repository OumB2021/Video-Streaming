"use client";

import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingVideo } from "../stream-player/loading-video";
import { useLiveStreamStatus, useLiveStreamStore } from "./use-live-stream";
import { OfflineVideo } from "../stream-player/offline-video";
import { CameraOffIcon, Loader2Icon, WifiOffIcon } from "lucide-react";

export default function Video({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isLive = useLiveStreamStore((state) => state.isLive);
  const isConnected = useLiveStreamStore((state) => state.isConnected);

  const status = useMemo(() => {
    if (isPlaying) return "live";
    if (isLive) return "loading";
    if (isConnected) return "waiting";
    return "offline";
  }, [isLive, isConnected, isPlaying]);

  useEffect(() => {
    if (!videoRef.current || !isLive) return;

    const video = videoRef.current;
    let hls: Hls | undefined;

    if (Hls.isSupported()) {
      hls = new Hls({
        liveSyncDurationCount: 5,
        maxMaxBufferLength: 10,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        video.play();
      });
    } else {
      video.src = src;
      video.onloadedmetadata = () => {
        video.play();
      };
    }

    video.onplay = () => {
      setIsPlaying(true);
    };
    video.onpause = () => {
      setIsPlaying(false);
    };
    video.onended = () => {
      setIsPlaying(false);
    };

    return () => {
      hls?.destroy();
    };
  }, [src, isLive]);

  return (
    <div className="relative">
      <video ref={videoRef} className="w-full h-full aspect-video" controls />
      {status === "waiting" && (
        <TitleIconView
          title="Waiting for host to start..."
          icon={<CameraOffIcon className="size-10" />}
        />
      )}
      {status === "offline" && (
        <TitleIconView
          title="Offline"
          icon={<WifiOffIcon className="size-10" />}
        />
      )}
    </div>
  );
}

function TitleIconView({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 h-full flex flex-col space-y-4 justify-center items-center text-muted-foreground bg-neutral-950/50">
      {icon}
      <p>{title}</p>
    </div>
  );
}
