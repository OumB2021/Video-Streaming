import { useEffect } from "react";
import { io } from "socket.io-client";
import { create } from "zustand";

type LiveStreamStore = {
  isLive: boolean;
  isConnected: boolean;
  totalViewers: number;
  setIsLive: (isLive: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;
  setTotalViewers: (totalViewers: number) => void;
};

export const useLiveStreamStore = create<LiveStreamStore>((set) => ({
  isLive: false,
  isConnected: false,
  totalViewers: 0,
  setIsLive: (isLive: boolean) => set({ isLive }),
  setIsConnected: (isConnected: boolean) => set({ isConnected }),
  setTotalViewers: (totalViewers: number) => set({ totalViewers }),
}));

export const useLiveStreamStatus = (id: string) => {
  const setIsLive = useLiveStreamStore((state) => state.setIsLive);
  const setIsConnected = useLiveStreamStore((state) => state.setIsConnected);
  const setTotalViewers = useLiveStreamStore((state) => state.setTotalViewers);

  useEffect(() => {
    const socket = io(`ws://localhost:3001/watch/${id}`);

    socket.onAny((event) => {
      console.log("socket", event);
    });

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("viewer-count", (count: number) => {
      setTotalViewers(count);
    });

    socket.on("stream-started", () => {
      setIsLive(true);
    });

    socket.on("stream-ended", () => {
      setIsLive(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);
};
