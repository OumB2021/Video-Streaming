import { headers } from "next/headers";
import { WebhookReceiver } from "livekit-server-sdk";

import { db } from "@video-streaming/database";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = headers();
  const authorization = headerPayload.get("Authorization");

  if (!authorization) {
    return new Response("No authorization header", { status: 401 });
  }
  const evt = await receiver.receive(body, authorization);

  if (!evt) {
    console.log("is the error here ?");
    return new Response("Webhook not parsed", { status: 422 });
  }

  try {
    if (evt.event === "ingress_started") {
      await db.stream.update({
        where: {
          ingressId: evt.ingressInfo?.ingressId,
        },
        data: {
          isLive: true,
        },
      });
    } else if (evt.event === "ingress_ended") {
      await db.stream.update({
        where: {
          ingressId: evt.ingressInfo?.ingressId,
        },
        data: {
          isLive: false,
        },
      });
    } else {
      return new Response("Unused even type", { status: 400 });
    }
  } catch (dbError) {
    console.error("Database error", dbError);
    return new Response("Failed to update database", { status: 500 });
  }

  console.log("Ingress Id: ", evt.ingressInfo?.ingressId);
  return new Response("Operation was successfull", { status: 200 });
}
