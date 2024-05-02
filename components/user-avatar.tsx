import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { Avatar, AvatarFallBack, AvatarImage } from "./ui/avatar";
import { LiveBadge } from "./live-badge";

const avatarSizes = cva("", {
  variants: {
    size: {
      default: "h-8 w-8",
      lg: "h-14 w-14",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface UserAvatarProps extends VariantProps<typeof avatarSizes> {
  username: string;
  imageUrl: string;
  isLive?: boolean;
  showBadge?: boolean;
}

export const UserAvatar = ({
  username,
  imageUrl,
  isLive,
  showBadge,
  size,
}: UserAvatarProps) => {
  const canShowBage = showBadge && isLive;
  return (
    <div className="relative">
      <Avatar
        className={cn(
          isLive && "ring-2 ring-rose-500 border border-background",
          avatarSizes({ size })
        )}
      >
        <AvatarImage src={imageUrl} className="object-cover" />
        {/* <AvatarFallBack>
          {username[0]}
          {username[username.length - 1]}
        </AvatarFallBack> */}
      </Avatar>
      {canShowBage && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
          {" "}
          <LiveBadge />{" "}
        </div>
      )}
    </div>
  );
};

interface UserAvatarSkeletonProps extends VariantProps<typeof avatarSizes> {}

export const userAvatarSkeleton = ({ size }: UserAvatarSkeletonProps) => {
  return <Skeleton className={cn("rounded-full", avatarSizes({ size }))} />;
};
