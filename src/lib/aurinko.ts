"use server";

import { auth } from "@clerk/nextjs/server";
import axios from "axios"; // Add this import

export const getAurinkoAuthUrl = async (
  serviceType: "Google" | "Office365",
) => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const params = new URLSearchParams({
    clientId: process.env.AURINKO_CLIENT_ID as string,
    serviceType,
    scopes: [
      "Mail.Read",
      "Mail.ReadWrite",
      "Mail.Send",
      "Mail.Drafts",
      "Mail.All",
      "Calendar.ReadWrite",
      "Contacts.ReadWrite",
    ].join(" "),
    responseType: "code",
    returnUrl: `${process.env.NEXT_PUBLIC_URL}/api/aurinko/callback`,
    state: userId, // Add state parameter for security
  });

  return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
};

export const exchangeCodeForAccessToken = async (code: string) => {
  try {
    const response = await axios.post(
      "https://api.aurinko.io/v1/account",
      {
        code,
        grantType: "authorization_code",
      },
      {
        auth: {
          username: process.env.AURINKO_CLIENT_ID as string,
          password: process.env.AURINKO_CLIENT_SECRET as string, // Fix typo in env variable name
        },
      }
    );

    if (!response.data) {
      throw new Error("No data received from Aurinko");
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Aurinko API Error:", error.response?.data);
      throw new Error(`Aurinko API Error: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};