import { getFollowedUsers } from "@/lib/follow-service";
import { Recommended, RecommendedSkeleton } from "./recommended";
import { Toggle } from "./toggle";
import { Wrapper } from "./wrapper";

import { getRecommended } from "@/lib/recommended-service";
import { Following, FollowingSkeleton } from "./following";

export const Sidebar = async () => {
  const [recommended, following] = await Promise.all([
    getRecommended().catch(() => []),
    getFollowedUsers().catch(() => []),
  ]);

  return (
    <Wrapper>
      <Toggle />
      <div className="space-y-4 pt-4 lg:pt-0">
        <Following data={following} />
        <Recommended data={recommended} />
      </div>
    </Wrapper>
  );
};

export const SideBarSkeleton = () => {
  return (
    <aside className="fixed left-0 flex flex-col w-[70px] lg:w-60 h-full bg-background border-r border-[#2D2E35] z-50">
      <FollowingSkeleton />
      <RecommendedSkeleton />
    </aside>
  );
};
