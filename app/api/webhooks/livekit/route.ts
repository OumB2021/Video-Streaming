import { headers } from "next/headers";
import { WebhookReceiver } from "livekit-server-sdk";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

const receiver = new WebhookReceiver(
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = headers();
  const authorization = headerPayload.get("Authorization");

  if (!authorization) {
    return new Response("No authorization header", { status: 400 });
  }

  let event;
  try {
    event = receiver.receive(body, authorization);
  } catch (error) {
    console.error("Error receiving event", error);
    return new Response("No authorization header", { status: 400 });
  }

  if (!event) {
    return new Response("Webhook not parsed", { status: 400 });
  }

  try {
    if (event.event === "ingress_started") {
      await db.stream.update({
        where: {
          ingressId: event.ingressInfo?.ingressId,
        },
        data: {
          isLive: true,
        },
      });
    } else if (event.event === "ingress_ended") {
      await db.stream.update({
        where: {
          ingressId: event.ingressInfo?.ingressId,
        },
        data: {
          isLive: false,
        },
      });
    }
  } catch (dbError) {
    console.error("Database error", dbError);
    return new Response("Failed to update database", { status: 500 });
  }

  return new Response("Operation was successfull", { status: 200 });
}
