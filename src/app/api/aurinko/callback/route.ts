import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForAccessToken } from "@/lib/aurinko";

export const GET = async (req: NextRequest) => {
  const { userId } = await auth();
  console.log("userid", userId);

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const error = params.get("error");

  if (error) {
    console.error("OAuth Error:", error);
    return NextResponse.json(
      { message: `Authentication failed: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json({ message: "No code provided" }, { status: 400 });
  }

  try {
    const tokenData = await exchangeCodeForAccessToken(code);
    console.log("Token data received:", tokenData);
    return NextResponse.json({ success: true, data: tokenData });
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      { message: "Failed to exchange token" },
      { status: 500 }
    );
  }
};