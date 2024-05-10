import Image from "next/image";
import { UserAvatar } from "./user-avatar";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

interface ThumbnailProps {
  src: string | null;
  fallback: string;
  isLive: boolean;
  username: string;
}

export const Thumbnail = ({
  src,
  fallback,
  isLive,
  username,
}: ThumbnailProps) => {
  let content;
  if (!src) {
    content = (
      <div
        className={cn(
          "bg-background flex flex-col items-center justify-center gap-y-4 h-full w-full transition-transform group-hover:translate-x-2 group-hover:-translate-y-2 rounded-md",
          isLive && "ring-1 ring-rose-500 border"
        )}
      >
        <UserAvatar
          size={"lg"}
          showBadge
          username={username}
          imageUrl={fallback}
          isLive={isLive}
        />
      </div>
    );
  } else {
    content = (
      <Image
        src={src}
        fill
        alt="Thumbnail"
        className="object-cover rounded-md group-hover:translate-x-2 group-hover:-translate-y-2"
      />
    );
  }
  return (
    <div className="group aspect-video relative rounded-md cursor-pointer ">
      <div className="rounded-md absolute inset-0 bg-white/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
      {content}
    </div>
  );
};

export const ThumbnailSkeleton = () => {
  return (
    <div className="group aspect-video relative rounded-xl cursor-pointer">
      <Skeleton className="h-full w-full" />
    </div>
  );
};
