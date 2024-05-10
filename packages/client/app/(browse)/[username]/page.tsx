import { getUserByUsername } from "@/lib/user-service";
import { notFound } from "next/navigation";
import { Actions } from "./_components/actions";
import { isFollowingUser } from "@/lib/follow-service";
import { StreamPlayer } from "@/components/stream-player";
import dynamic from "next/dynamic";

const LocalStreamPlayer = dynamic(
  () => import("@/components/local-stream-player"),
  {
    ssr: false,
  }
);

interface UserPageProps {
  params: {
    username: string;
  };
}

const UserPage = async ({ params }: UserPageProps) => {
  const user = await getUserByUsername(params.username);

  if (!user || !user.stream) {
    notFound();
  }

  const isFollowing = await isFollowingUser(user.id);

  return user.stream.type === "LIVEKIT" ? (
    <StreamPlayer user={user} stream={user.stream} isFollowing={isFollowing} />
  ) : (
    <LocalStreamPlayer user={user} stream={user.stream} />
  );
};

export default UserPage;
