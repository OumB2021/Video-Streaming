import { getSelf } from "./auth-service";
import { db } from "./db";

export const getUserByUsername = async (username: string) => {
  const self = await getSelf().catch(() => null);

  const user = await db.user.findUnique({
    where: { username },
    include: {
      followedBy: self ? { where: { followerId: self.id } } : undefined,
      stream: true,
      _count: {
        select: {
          followedBy: true,
        },
      },
    },
  });

  if (!user) return null;

  const { followedBy, ...rest } = user;
  return {
    ...rest,
    isFollowing: followedBy ? followedBy.length > 0 : false,
  };
};

export const getUserById = async (id: string) => {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      stream: true,
    },
  });

  return user;
};
