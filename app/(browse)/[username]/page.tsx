import { isFollowingUser } from "@/lib/follow-service";
import { getUserByUsername } from "@/lib/user-service";
import { notFound } from "next/navigation";
import { Actions } from "./_components/actions";

interface UserPagePropos {
  params: {
    username: string;
  };
}

const UserPage = async ({ params }: UserPagePropos) => {
  const user = await getUserByUsername(params.username);
  if (!user) {
    notFound();
  }

  const isFollowing = await isFollowingUser(user.id);
  return (
    <div className="flex flex-col g-y-4">
      <p>username: {user.username}</p>
      <p>user id : {user.id}</p>
      <p>is following: {`${isFollowing}`}</p>
      <Actions isFollowing={isFollowing} />
    </div>
  );
};

export default UserPage;
