"use client";

import { onFollow } from "@/actions/follow";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { toast } from "sonner";

interface ActionProps {
  isFollowing: boolean;
}

export const Actions = ({ isFollowing }: ActionProps) => {
  const [isPending, startTransition] = useTransition();

  console.log(`what's the value here ${isFollowing}`);

  const onClick = () => {
    startTransition(() => {
      onFollow("123")
        .then(() => toast.success("Followed the user"))
        .catch(() => toast.error("Failed to follow)"));
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
