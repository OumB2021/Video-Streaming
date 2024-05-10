"use client";

import { Button } from "@/components/ui/button";
import { Transition } from "@headlessui/react";
import { Loader2Icon, VideoOffIcon } from "lucide-react";
import { useWebRTC } from "./use-webrtc";
import { UserAvatar } from "@/components/user-avatar";

export default function Stream({ id }: { id: string }) {
  const { isActive, start, stop, localVideo, signalStatus, rtcStatus } =
    useWebRTC(id);

  return (
    <div>
      <div className="relative bg-neutral-950 border-b">
        <video
          className="w-full h-full aspect-video"
          ref={localVideo}
          autoPlay
          muted
        />
        <Transition
          show={rtcStatus === "connected"}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute bottom-0 right-0 p-2.5">
            <Button size="sm" variant="destructive" onClick={stop}>
              End Stream
            </Button>
          </div>
        </Transition>
        <Transition
          show={rtcStatus !== "connected"}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="bg-neutral-950 absolute top-0 left-0 bottom-0 right-0 z-10 flex justify-center items-center">
            {isActive ? (
              <div className="h-full flex flex-col space-y-4 justify-center items-center">
                <Loader2Icon className="size-10 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground capitalize">
                  Connecting...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-y-4 text-muted-foreground">
                <VideoOffIcon className="size-12" />
                <p>Ready to start streaming?</p>
                <Button onClick={start}>Go Live</Button>
              </div>
            )}
          </div>
        </Transition>
      </div>
      <div className="px-3 py-2"></div>
    </div>
  );
}
