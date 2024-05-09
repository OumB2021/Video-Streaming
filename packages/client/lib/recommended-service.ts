import { db } from "@video-streaming/database";
import type { User, Stream } from "@prisma/client";

import { getSelf } from "./auth-service";

export interface UserWithStream extends User {
  stream: Stream | null
}

export const getRecommended = async (): Promise<UserWithStream[]> => {
  const userId = await getSelf()
    .then((user) => user.id)
    .catch(() => null);

  const recommendedUsers = await db.user.findMany({
    where: userId
      ? {
          AND: [
            {
              NOT: { id: userId },
            },
            {
              NOT: {
                followedBy: {
                  some: {
                    followerId: userId,
                  },
                },
              },
            },
          ],
        }
      : undefined,
    include: {
      stream: {
        where: {
          isLive: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return recommendedUsers;
};
