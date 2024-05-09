"use client";

import { useAuth } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { onFollow, onUnfollow } from "@/actions/follow";
import { useTransition } from "react";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

interface ActionsProps {
  isFollowing: boolean;
  hostIdentity: string;
  isHost: boolean;
  followedByCount;
}

export const Actions = ({
  isFollowing,
  hostIdentity,
  isHost,
  followedByCount,
}: ActionsProps) => {
  const [isPending, startTransition] = useTransition();
  const { userId } = useAuth();
  const router = useRouter();
  const handleFollow = () => {
    startTransition(() => {
      onFollow(hostIdentity).then((data) =>
        toast
          .success(`You are now following ${data.following.username}`)
          .catch(() => toast.error("Something went wrong"))
      );
    });
  };

  const handleUnfollow = () => {
    startTransition(() => {
      onUnFollow(hostIdentity).then((data) =>
        toast
          .success(`You have unfollowed ${data.following.username}`)
          .catch(() => toast.error("Something went wrong"))
      );
    });
  };

  const toggleFollow = () => {
    if (!userId) {
      return router.push("/sign-in");
    }

    if (isHost) return;

    if (isFollowing) {
      handleUnfollow();
    } else {
      handleFollow();
    }
  };

  const followedByLabel = followedByCount === 1 ? "follower" : "followers";
  return (
    <div className="flex flex-col space-y-2">
      <div className="text-sm text-center text-muted-foreground gap-x-3">
        <span className="font-semibold text-primary">{followedByCount}</span>{" "}
        {followedByLabel}
      </div>
      <div>
        <Button
          disabled={isPending || isHost}
          onClick={toggleFollow}
          variant={"primary"}
          size={"sm"}
          className="w-full lg:w-auto"
        >
          <Heart
            className={cn(
              "h-4 w-4 mr-2",
              isFollowing ? "fill-white" : "fill-none"
            )}
          />
          {isFollowing ? "Unfollow" : "Follow"}
        </Button>
      </div>
    </div>
  );
};

export const ActionsSkeleton = () => {
  return <Skeleton className="h-10 w-full lg:w-24" />;
};
