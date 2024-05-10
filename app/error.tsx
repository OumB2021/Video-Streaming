"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

const ErrorPage = () => {
  return (
    <div className="h-full flex flex-col space-y-4 items-center justify-center text-muted-foreground">
      <p>Something went wrong.</p>
      <Button variant={"primary"} asChild>
        <Link href={"/"}>Navigate to main page</Link>
      </Button>
    </div>
  );
};

export default ErrorPage;
