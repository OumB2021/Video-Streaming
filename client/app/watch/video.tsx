"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VideoPlayer = ({ streams }: { streams: string[] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedStream, setSelectedStream] = useState();

  useEffect(() => {
    let hls: Hls | undefined;

    if (videoRef.current) {
      const video = videoRef.current;

      if (Hls.isSupported()) {
        hls = new Hls({
          liveSyncDurationCount: 5,
          maxMaxBufferLength: 10,
        });
        hls.loadSource(`http://localhost:3001/watch/${selectedStream}`);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          video.play();
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = `http://localhost:3001/watch/${selectedStream}`;
        video.addEventListener("loadedmetadata", function () {
          video.play();
        });
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [selectedStream]);

  return (
    <div>
      {selectedStream && <video ref={videoRef} controls></video>}
      <Select
        value={selectedStream}
        onValueChange={(value) => setSelectedStream(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Stream" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Stream</SelectLabel>
            {streams.map((stream) => (
              <SelectItem key={stream} value={stream}>
                {stream}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default VideoPlayer;
