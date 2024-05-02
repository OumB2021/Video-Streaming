import { db } from "./db";
import { getSelf } from "./auth-service";

export const isFollowingUser = async (id: String) => {
  try {
    const self = await getSelf();

    const otherUser = await db.user.findUnique({
      where: { id },
    });

    if (!otherUser) {
      throw new Error("User not found");
    }

    if (otherUser.id === self.id) {
      return true;
    }

    const existingFollow = await db.Follow.findFirst({
      where: { followerId: self.id, followingId: otherUser },
    });

    return !!existingFollow;
  } catch (error) {}
};
