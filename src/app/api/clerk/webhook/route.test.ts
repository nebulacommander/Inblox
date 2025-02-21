import { expect, mock, describe, test, beforeEach } from "bun:test";
import { POST } from "./route";
import { db } from "@/server/db";
import { Webhook } from "svix";

// Mock the database module
mock.module("@/server/db", () => ({
  db: {
    user: {
      create: mock(() => ({})),
    },
  },
}));

// Mock the svix Webhook
mock.module("svix", () => ({
  Webhook: class MockWebhook {
    constructor(_secret: string | Uint8Array) {}
    verify() {
      return {
        data: {
          id: "test-user-id",
          email_addresses: [{ email_address: "test@example.com" }],
          first_name: "Test",
          last_name: "User",
          image_url: "https://example.com/image.jpg",
        },
        type: "user.created",
      };
    }
    sign = mock(() => {});
    verifyTimestamp = mock(() => {});
  },
}));

// Mock next/headers
mock.module("next/headers", () => ({
  headers: () =>
    new Map([
      ["svix-id", "test-id"],
      ["svix-timestamp", "test-timestamp"],
      ["svix-signature", "test-signature"],
    ]),
}));

describe("Clerk Webhook Handler", () => {
  beforeEach(() => {
    // Reset mocks before each test
    process.env.CLERK_WEBHOOK_SECRET = "test-secret";
    mock.restore();
  });

  test("should create a user when receiving user.created event", async () => {
    const mockUserData = {
      id: "test-user-id",
      email_addresses: [{ email_address: "test@example.com" }],
      first_name: "Test",
      last_name: "User",
      image_url: "https://example.com/image.jpg",
    };

    const request = new Request("http://localhost:3000/api/clerk/webhook", {
      method: "POST",
      body: JSON.stringify(mockUserData),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.message).toBe("User created successfully");
    expect(responseData.userId).toBe("test-user-id");
    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        id: "test-user-id",
        emailAddress: "test@example.com",
        firstName: "Test",
        lastName: "User",
        imageUrl: "https://example.com/image.jpg",
      },
    });
  });

  test("should handle invalid webhook signature", async () => {
    mock.module("svix", () => ({
      Webhook: class MockWebhook {
        constructor(_secret: string | Uint8Array) {}
        verify() {
          throw new Error("Invalid signature");
        }
      },
    }));

    const request = new Request("http://localhost:3000/api/clerk/webhook", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("should handle missing webhook secret", async () => {
    process.env.CLERK_WEBHOOK_SECRET = "";

    const request = new Request("http://localhost:3000/api/clerk/webhook", {
      method: "POST",
      body: JSON.stringify({}),
    });

    try {
      await POST(request);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        "Please add CLERK_WEBHOOK_SECRET to .env file",
      );
    }
  });

  test("should handle database errors", async () => {
    mock.module("@/server/db", () => ({
      db: {
        user: {
          create: mock(() => {
            throw new Error("Database error");
          }),
        },
      },
    }));

    const mockUserData = {
      id: "test-user-id",
      email_addresses: [{ email_address: "test@example.com" }],
      first_name: "Test",
      last_name: "User",
      image_url: "https://example.com/image.jpg",
    };

    const request = new Request("http://localhost:3000/api/clerk/webhook", {
      method: "POST",
      body: JSON.stringify(mockUserData),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.error).toBe("Error creating user");
  });

  test("should handle unknown event type", async () => {
    mock.module("svix", () => ({
      Webhook: class MockWebhook {
        constructor(_secret: string | Uint8Array) {}
        verify() {
          return {
            data: { id: "test-id" },
            type: "unknown.event",
          };
        }
      },
    }));

    const request = new Request("http://localhost:3000/api/clerk/webhook", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.type).toBe("unknown.event");
  });
});
