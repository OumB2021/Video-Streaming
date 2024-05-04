import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import { db } from "@/lib/db";

export const getSelf = cache(async () => {
  const self = await currentUser();

  if (!self || !self.username) {
    throw new Error("unauthorized");
  }

  const user = await db.user.findUnique({
    where: { externalUserId: self.id },
  });

  if (!user) {
    throw new Error(`${self.id} not found in database`);
  }

  return user;
});
