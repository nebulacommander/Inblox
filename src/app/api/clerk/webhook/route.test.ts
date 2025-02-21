import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { db } from "@/server/db";
import { Webhook } from 'svix';

vi.mock('@/server/db');
vi.mock('svix');
vi.mock('next/headers', () => ({
  headers: () => new Map([
    ['svix-id', 'test-id'],
    ['svix-timestamp', 'test-timestamp'],
    ['svix-signature', 'test-signature'],
  ])
}));

describe('Clerk Webhook Handler', () => {
  it('should create a user when receiving user.created event', async () => {
    const mockUserData = {
      id: 'test-user-id',
      email_addresses: [{ email_address: 'test@example.com' }],
      first_name: 'Test',
      last_name: 'User',
      image_url: 'https://example.com/image.jpg'
    };

    // Mock webhook verification using constructor
    vi.mocked(Webhook).mockImplementation((key: string) => {
      return {
        verify: () => ({
          data: mockUserData,
          type: 'user.created'
        }),
        sign: vi.fn(),
        verifyTimestamp: vi.fn()
      } as unknown as Webhook;
    });

    // Mock database creation
    vi.mocked(db.user.create).mockResolvedValue({} as any);

    const request = new Request('http://localhost:3000/api/clerk/webhook', {
      method: 'POST',
      body: JSON.stringify(mockUserData)

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
