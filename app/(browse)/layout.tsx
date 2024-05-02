import { Suspense } from "react";
import { Container } from "./_components/container";
import { Navbar } from "./_components/navbar";
import { SideBarSkeleton, Sidebar } from "./_components/sidebar";

const BrowseLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Navbar />
      <div className="flex h-full pt-20">
        <Suspense fallback={<SideBarSkeleton />}>
          <Sidebar />
        </Suspense>
        <Container>{children}</Container>
      </div>
    </>
  );
};

export default BrowseLayout;
