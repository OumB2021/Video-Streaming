import type { Metadata } from "next";
import VideoPlayer from "./video";

export const metadata: Metadata = {
  title: "Watch",
};

const api = {
  list: () =>
    fetch("http://localhost:3001/streams", { cache: "no-store" })
      .then(
        (res) =>
          res.json() as Promise<
            | { status: "success"; data: { streams: string[] } }
            | {
                status: "error";
                error: Record<string, unknown>;
                message: string;
              }
          >
      )
      .then((res) => {
        if (res.status === "success") {
          return res.data;
        } else {
          console.error(res.message, res.error);
          throw new Error(res.message);
        }
      }),
};

export default async function Page() {
  const { streams } = await api.list();

  return <VideoPlayer streams={streams} />;
}
