import VideoPlayer from "./video";

export default async function Page() {
  const res = await fetch("http://localhost:3001/list", {
    cache: "no-store",
  });
  const streams = await res.json();

  return <VideoPlayer streams={streams} />;
}
