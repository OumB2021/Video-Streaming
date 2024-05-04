"use server";

import { followUser, unfollowUser } from "@/lib/follow-service";
import { action } from "@/lib/safe-action";
import { revalidatePath } from "next/cache";
import z from "zod";

export const onFollow = action(z.string(), async (id) => {
  const followedUser = await followUser(id);

  revalidatePath("/");
  revalidatePath(`/${followedUser.following.username}`);

  return { ...followedUser, isFollowing: true as boolean };
});

export const onUnfollow = action(z.string(), async (id) => {
  const unfollowedUser = await unfollowUser(id);

  revalidatePath("/");
  revalidatePath(`/${unfollowedUser.following.username}`);

  return { ...unfollowedUser, isFollowing: false as boolean };
});
