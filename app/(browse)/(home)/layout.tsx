import { Navbar } from "../_components/navbar";

const BrowseLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Navbar />
      <div className="flex h-fuull pt-20"></div>
      {children}
    </>
  );
};

export default BrowseLayout;
