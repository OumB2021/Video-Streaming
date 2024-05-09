import { getUserByUsername } from "@/lib/user-service";
import { notFound } from "next/navigation";
import { Actions } from "./_components/actions";

interface UserPageProps {
  params: {
    username: string;
  };
}

const UserPage = async ({ params }: UserPageProps) => {
  const user = await getUserByUsername(params.username);

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col g-y-4">
      <p>username: {user.username}</p>
      <p>user id : {user.id}</p>
      <p>is following: {`${user.isFollowing}`}</p>
      <Actions userId={user.id} isFollowing={user.isFollowing} />
    </div>
  );
};

export default UserPage;
