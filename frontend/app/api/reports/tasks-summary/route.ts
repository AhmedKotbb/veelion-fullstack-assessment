import { NextResponse } from "next/server";
import { errorForRoute, getTasksSummaryFromBackend } from "@/lib/backendApi";

export async function GET() {
  try {
    const summary = await getTasksSummaryFromBackend();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const { status, message } = errorForRoute(error, "Unable to fetch the task summary.");
    return NextResponse.json({ error: { message } }, { status });
  }
}
