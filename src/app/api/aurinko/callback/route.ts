import { exchangeCodeForAccessToken, getAccountDetails } from "@/lib/aurinko";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  const { userId } = await auth();

  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const status = params.get("status");
  if (status != "success")
    return NextResponse.json(
      { message: "Failed to Link Account" },
      { status: 400 },
    );

  // get the code to exchange for the accesss token
  const code = params.get("code");
  if (!code)
    return NextResponse.json({ message: "No code provided" }, { status: 400 });
  const token = await exchangeCodeForAccessToken(code);
  if (!token)
    return NextResponse.json(
      { message: "Failed to exchange code for access token" },
      { status: 400 },  
    )

    try {
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
      console.error("Database error:", error);
      return NextResponse.json(
        { message: "Failed to save account details" },
        { status: 500 }
      );
    }
};
