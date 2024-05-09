"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/safe-action";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const StreamSchema = z
  .object({
    name: z.string(),
    isChatEnabled: z.boolean(),
    isChatFollowersOnly: z.boolean(),
    isChatDelayed: z.boolean(),
  })
  .partial();

export const updateStream = action(StreamSchema, async (values, { self }) => {
  const selfStream = await db.stream.findUnique({
    where: { userId: self.id },
  });

  if (!selfStream) {
    throw new Error("Stream not found");
  }

  const stream = await db.stream.update({
    where: {
      id: selfStream.id,
    },
    data: {
      thumbnailUrl: values.thumbnailUrl,
      name: values.name,
      isChatEnabled: values.isChatEnabled,
      isChatFollowersOnly: values.isChatFollowersOnly,
      isChatDelayed: values.isChatDelayed,
    },
  });

  revalidatePath(`/u/${self.username}/chat`);
  revalidatePath(`/u/${self.username}`);
  revalidatePath(`/${self.username}`);

  return stream;
});
