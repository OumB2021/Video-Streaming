import { Container } from "../(dashboard)/u/[username]/_components/container";
import { Navbar } from "../(dashboard)/u/[username]/_components/navbar";
import { Sidebar } from "../(dashboard)/u/[username]/_components/sidebar";

export default function StreamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="flex h-full pt-20">
        <Sidebar />
        <Container>{children}</Container>
        <div className="w-96 h-full bg-gray-900"></div>
      </div>
    </>
  );
}
