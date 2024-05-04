import { db } from "./db";

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
    orderBy: {
      createdAt: "desc",
    },
  });

  return recommendedUsers;
};
