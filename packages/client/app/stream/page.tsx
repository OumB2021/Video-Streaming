import { Metadata } from "next";
import Stream from "./stream";
import { getSelf } from "@/lib/auth-service";
import { getStreamByUserId } from "@/lib/service-service";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Stream",
};

export default async function Page() {
  const user = await getSelf();
  const stream = await getStreamByUserId(user.id);

  if (!stream) {
    notFound();
  }

  return <Stream id={stream.id} />;
}
