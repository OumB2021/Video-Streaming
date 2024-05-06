"use server";

import { getSelf } from "@/lib/auth-service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  IngressAudioEncodingPreset,
  IngressInput,
  IngressClient,
  IngressVideoEncodingPreset,
  RoomServiceClient,
  TrackSource,
  type CreateIngressOptions,
} from "livekit-server-sdk";
import { revalidatePath } from "next/cache";

const roomService = new RoomServiceClient(
  env.LIVEKIT_API_URL,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

const ingressClient = new IngressClient(env.LIVEKIT_API_URL);

export const resetIngresses = async (hostIdentity: string) => {
  const ingresses = await ingressClient.listIngress({
    roomName: hostIdentity,
  });

  const rooms = await roomService.listRooms([hostIdentity]);

  for (const room of rooms) {
    await roomService.deleteRoom(room.name);
  }

  for (const ingress of ingresses) {
    if (ingress.ingressId) {
      await ingressClient.deleteIngress(ingress.ingressId);
    }
  }
};
export const createIngress = async (ingressType: IngressInput) => {
  const self = await getSelf();

  await resetIngresses(self.id);

  const options: CreateIngressOptions = {
    name: self.username,
    roomName: self.id,
    participantName: self.username,
    participantIdentity: self.id,
  };

  // if (ingressType === IngressInput.WHIP_INPUT) {
  //   options.enableTranscoding = false;
  // } else {
  //   options.video = {
  //     name: "video",
  //     source: TrackSource.CAMERA,
  //     preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
  //   };

  //   options.audio = {
  //     name: "audio",
  //     source: TrackSource.MICROPHONE,
  //     preset: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
  //   };
  // }

  if (ingressType === IngressInput.WHIP_INPUT) {
    options.enableTranscoding = false;
  } else {
    options.video = {
      name: "video",
      source: TrackSource.CAMERA,
      encodingOptions: {
        case: "preset",
        value: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
      },
    } as CreateIngressOptions["video"];

    options.audio = {
      name: "audio",
      source: TrackSource.MICROPHONE,
      encodingOptions: {
        case: "preset",
        value: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
      },
    } as CreateIngressOptions["audio"];
  }

  const ingress = await ingressClient.createIngress(ingressType, options);

  if (!ingress || !ingress.url || !ingress.streamKey) {
    throw new Error("Failed to create ingress");
  }

  await db.stream.update({
    where: { userId: self.id },
    data: {
      ingressId: ingress.ingressId,
      serverUrl: ingress.url,
      streamKey: ingress.streamKey,
    },
  });

  revalidatePath(`/u/${self.username}/keys`);

  return ingress.toJson();
};
