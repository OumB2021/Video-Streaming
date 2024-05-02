"use client";

import { onFollow } from "@/actions/follow";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { toast } from "sonner";

interface ActionProps {
  isFollowing: boolean;
  userId: String;
}

export const Actions = ({ isFollowing, userId }: ActionProps) => {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(() => {
      onFollow(userId)
        .then((data) =>
          toast.success(`You are now following ${data.following.username}`)
        )
        .catch(() => toast.error("Failed to follow"));
    });
  };
  return (
    <Button
      disabled={isFollowing || isPending}
      onClick={onClick}
      variant={"primary"}
    >
      Follow
    </Button>
  );
};
