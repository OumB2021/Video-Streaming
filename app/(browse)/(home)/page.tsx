"use client";

import Image from "next/image";
import { Results, ResultsSkeleton } from "./_components/results";
import { Suspense, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { getStreams } from "@/lib/feed-service";

export default function Home() {
  const [activeToggle, setActiveToggle] = useState("LIVEKIT");
  const handleToggle = (value) => {
    setActiveToggle(value);
  };

  return (
    <>
      <ToggleGroup className="m-4" type="single">
        <ToggleGroupItem
          value="LIVEKIT"
          aria-label="LIVEKIT"
          onClick={() => handleToggle("LIVEKIT")}
        >
          <div className="font-semibold">LIVEKIT</div>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="WEBRTC"
          aria-label="WEBRTC"
          onClick={() => handleToggle("WEBRTC")}
        >
          <div>WEBRTC</div>
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="h-full p-8 max-w-screen-2xl mx-auto">
        {activeToggle === "LIVEKIT" && (
          <Suspense fallback={<ResultsSkeleton />}>
            <Results />
          </Suspense>
        )}
        {activeToggle === "WEBRTC" && <div>WEBRTC</div>}
      </div>
    </>
  );
}
