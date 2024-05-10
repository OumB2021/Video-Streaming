import { Button } from "@/components/ui/button";
import Link from "next/link";

const NotFoundPage = () => {
  return (
    <div className="h-full flex flex-col space-y-4 items-center justify-center text-muted-foreground">
      <h1 className="text-4xl font-semibold"> 404</h1>
      <p>The page you were looking for couldn&apos;t be found.</p>
      <Button variant={"primary"} asChild>
        <Link href={"/"}>Navigate to main page</Link>
      </Button>
    </div>
  );
};

export default NotFoundPage;
