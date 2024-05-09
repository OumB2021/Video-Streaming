import { Metadata } from "next";
import Stream from "./stream";

export const metadata: Metadata = {
  title: "Stream",
};

export default function Page() {
  return <Stream />;
}
