import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidToken(request, secret) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const provided = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!hasValidToken(request, secret)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const mongoose = await dbConnect();
    await mongoose.connection.db.admin().ping();

    return NextResponse.json(
      { status: "ok", database: "reachable" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Keep-alive database ping failed:", error);
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
