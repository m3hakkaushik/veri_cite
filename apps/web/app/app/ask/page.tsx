import { Workspace } from "@/components/workspace";
import { auth } from "@clerk/nextjs/server";

export default async function AskPage() {
  await auth.protect();
  return <Workspace initialView="ask" />;
}
