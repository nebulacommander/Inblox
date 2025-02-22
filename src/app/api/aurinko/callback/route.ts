import { exchangeCodeForAccessToken, getAccountDetails } from "@/lib/aurinko";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const handshake = params.get("__clerk_handshake");
  
  // Check for Clerk handshake first
  if (handshake) {
    try {
      const parts = handshake.split('.');
      if (!parts[1]) throw new Error('Invalid handshake format');
      const decodedHandshake = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      );
      console.log("Decoded handshake:", decodedHandshake);
      
      // Exchange handshake for token
      const token = await exchangeCodeForAccessToken(handshake);
      if (!token) {
        throw new Error("Failed to exchange handshake for token");
      }

      const accountDetails = await getAccountDetails(token.accessToken);
      
      // Update database
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
  }

  // If no handshake, return error
  return NextResponse.json(
    { message: "No valid handshake found" },
    { status: 400 }
  );
};