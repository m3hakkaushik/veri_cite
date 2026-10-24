import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { TrustReport } from "@/components/trust-report";
import { readRun } from "@/lib/run-data";
import { ApiError, uuid } from "@/lib/api";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth.protect();
  const id = uuid.safeParse((await params).id);
  if (!id.success) notFound();
  let report;
  try {
    report = await readRun(id.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return <TrustReport initial={report} />;
}
