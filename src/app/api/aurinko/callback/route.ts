import { exchangeCodeForAccessToken, getAccountDetails } from "@/lib/aurinko";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const handshake = req.nextUrl.searchParams.get("__clerk_handshake");
  if (!handshake) {
    return NextResponse.json(
      { message: "No Clerk handshake found" },
      { status: 400 }
    );
  }

  try {
    // Exchange handshake directly for Aurinko token
    const token = await exchangeCodeForAccessToken(handshake);
    if (!token) {
      throw new Error("Failed to exchange handshake for token");
    }

    const accountDetails = await getAccountDetails(token.accessToken);
    
    await db.account.upsert({
      where: { id: token.accountId.toString() },
      update: {
        accessToken: token.accessToken,
      },
      create: {
        id: token.accountId.toString(),
        accessToken: token.accessToken,
        userId,
        emailAddress: accountDetails.email,
        name: accountDetails.name,
      },
    });

    return NextResponse.redirect(new URL("/mail", req.url));
  } catch (error) {
    console.error("Error processing handshake:", error);
    return NextResponse.json(
      { message: "Error processing handshake" },
      { status: 500 }
    );
  }
};