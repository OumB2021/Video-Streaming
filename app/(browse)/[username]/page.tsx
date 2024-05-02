interface UserPagePropos {
  params: {
    username: string;
  };
}

const UserPage = ({ params }: UserPagePropos) => {
  return <div>User:{params.username}</div>;
};

export default UserPage;
