import { Workspace } from "@/components/workspace";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await auth.protect();
  return (
    <Workspace
      initialView={
        (await searchParams).view === "history" ? "history" : "check"
      }
    />
  );
}
