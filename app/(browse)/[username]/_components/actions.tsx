"use client";

import { onFollow, onUnfollow } from "@/actions/follow";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { toast } from "sonner";

interface ActionProps {
  isFollowing: boolean;
  userId: string;
}

export const Actions = ({ isFollowing, userId }: ActionProps) => {
  const auth = useAuth();

  const action = isFollowing ? onUnfollow : onFollow;
  const type = isFollowing ? "unfollow" : "follow";

  const followAction = useAction(action, {
    onSuccess(data) {
      toast.success(
        `You have ${data.isFollowing ? "followed" : "unfollowed"} ${
          data.following.username
        }`
      );
    },
    onError(error) {
      toast.error(`Failed to ${type}`, {
        description:
          error.serverError ?? error.fetchError ?? "An unknown error occurred.",
      });
    },
  });

  if (!auth.isSignedIn) {
    return (
      <Button variant="outline" asChild>
        <Link href="/sign-in">Sign in to follow</Link>
      </Button>
    );
  }

  return (
    <LoadingButton
      loading={followAction.status === "executing"}
      onClick={() => followAction.execute(userId)}
      variant="primary"
      className="capitalize"
    >
      {type}
    </LoadingButton>
  );
};
