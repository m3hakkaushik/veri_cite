import { Workspace } from "@/components/workspace";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  await auth.protect();
  return <Workspace />;
}
