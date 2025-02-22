// /api/aurinko/callback/route.ts

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const GET = async (req: Request) => {
  const { userId } = await auth();
  console.log("user id is", userId);
  return NextResponse.json({ userId });
} 