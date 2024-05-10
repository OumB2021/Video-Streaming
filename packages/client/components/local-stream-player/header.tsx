"use client";

import type { User } from "@prisma/client";
import { UserIcon } from "lucide-react";
import { ActionsSkeleton } from "../stream-player/actions";
import { Skeleton } from "../ui/skeleton";
import { UserAvatar, UserAvatarSkeleton } from "../user-avatar";
import { VerifiedMark } from "../verified-mark";

interface HeaderProps {
  user: Pick<User, "id" | "username" | "imageUrl">;
}

export const Header = ({ user }: HeaderProps) => {
  const participantCount = Math.floor(Math.random() * 100);
  //   const participants = useParticipants();
  //   const participant = useRemoteParticipant(hostIdentity);
  //   const isLive = !!participant;
  //   const participantCount = participants.length - 1;
  //   const hostAsViewer = `host-${hostIdentity}`;
  //   const isHost = viewerIdentity === hostAsViewer;

  return (
    <div className="flex flex-col lg:flex-row gap-y-4 lg:gap-y-0 items-start justify-between px-4">
      <div className="flex items-center gap-x-3">
        <UserAvatar
          imageUrl={user.imageUrl}
          username={user.username}
          size="lg"
          isLive={true}
          showBadge={true}
        />
        <div className="space-y-1">
          <div className="flex items-center gap-x-2">
            <h2 className="text-lg font-semibold">{user.username}</h2>
            <VerifiedMark />
          </div>
          <p className="text-sm ">{user.username}</p>
          {
            <div className="font-semibold flex gap-x-1 items-center text-xs text-rose-500">
              <UserIcon className="h-4 w-4" />
              <p>
                {participantCount}{" "}
                {participantCount === 1 ? "viewer" : "viewers"}
              </p>
            </div>
          }
        </div>
      </div>
    </div>
  );
};

export const HeaderSkeleton = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-y-4 lg:gap-y-0 items-start justify-between px-4">
      <div className="flex items-center gap-x-3">
        <UserAvatarSkeleton size="lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <ActionsSkeleton />
    </div>
  );
};
