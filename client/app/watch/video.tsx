"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const VideoPlayer = ({ streams }: { streams: string[] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedStream, setSelectedStream] = useState(streams[0]);

  useEffect(() => {
    let hls: Hls | undefined;

    if (videoRef.current) {
      const video = videoRef.current;

      if (Hls.isSupported()) {
        hls = new Hls();
        // it's requesting over https, but the server is not https
        // make it stop
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
      <video ref={videoRef} controls></video>
      <select onChange={(e) => setSelectedStream(e.target.value)}>
        {streams.map((stream) => (
          <option key={stream} value={stream}>
            {stream}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VideoPlayer;
