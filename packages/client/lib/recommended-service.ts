import { db } from "@video-streaming/database";

import { getSelf } from "./auth-service";

export const getRecommended = async () => {
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
