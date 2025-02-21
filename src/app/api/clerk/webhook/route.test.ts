import { expect, mock, describe, test } from "bun:test";
import { POST } from './route';
import { db } from "@/server/db";
import { Webhook } from 'svix';

// Mock the database module
mock.module('@/server/db', () => ({
  db: {
    user: {
      create: mock(() => ({}))
    }
  }
}));

// Mock the svix Webhook
mock.module('svix', () => ({
  Webhook: class MockWebhook {
    constructor(_secret: string | Uint8Array) {}
    verify() {
      return {
        data: {
          id: 'test-user-id',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User',
          image_url: 'https://example.com/image.jpg'
        },
        type: 'user.created'
      };
    }
    sign = mock(() => {});
    verifyTimestamp = mock(() => {});
  }
}));

// Mock next/headers
mock.module('next/headers', () => ({
  headers: () => new Map([
    ['svix-id', 'test-id'],
    ['svix-timestamp', 'test-timestamp'],
    ['svix-signature', 'test-signature'],
  ])
}));

describe('Clerk Webhook Handler', () => {
  test('should create a user when receiving user.created event', async () => {
    const mockUserData = {
      id: 'test-user-id',
      email_addresses: [{ email_address: 'test@example.com' }],
      first_name: 'Test',
      last_name: 'User',
      image_url: 'https://example.com/image.jpg'
    };

    const request = new Request('http://localhost:3000/api/clerk/webhook', {
      method: 'POST',
      body: JSON.stringify(mockUserData)
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.message).toBe('User created successfully');
    expect(responseData.userId).toBe('test-user-id');
    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        id: 'test-user-id',
        emailAddress: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        imageUrl: 'https://example.com/image.jpg'
      }
    });
  });
});
