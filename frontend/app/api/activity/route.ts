import { NextResponse } from "next/server";
import { errorForRoute, getActivityFromBackend } from "@/lib/backendApi";

export async function GET() {
  try {
    const logs = await getActivityFromBackend();
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    const { status, message } = errorForRoute(error, "Unable to fetch activity logs.");
    return NextResponse.json({ error: { message } }, { status });
  }
}
