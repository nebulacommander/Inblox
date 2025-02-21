import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  const { userId } = await auth();
  console.log("userid is", userId);
  return NextResponse.json({ message: "Hello world" });
};
