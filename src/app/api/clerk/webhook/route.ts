import { db } from "@/server/db"
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'

export const POST = async (req: Request) => {
    // 1. Verify the webhook signature
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET to .env file')
    }

    // 2. Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // 3. Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // 4. Verify the webhook
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id!,
            "svix-timestamp": svix_timestamp!,
            "svix-signature": svix_signature!,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occured', { status: 400 })
    }

    // 5. Get the ID and type
    const { id } = evt.data;
    const eventType = evt.type;

    // 6. Handle user.created event
    if (eventType === "user.created") {
        const { email_addresses, first_name, last_name, image_url } = evt.data;
        
        try {
            await db.user.create({
                data: {
                    id: id,
                    emailAddress: email_addresses[0]?.email_address ?? '',
                    firstName: first_name ?? '',
                    lastName: last_name ?? '',
                    imageUrl: image_url ?? ''
                }
            })
            
            return new Response(JSON.stringify({ message: 'User created successfully', userId: id }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        } catch (error) {
            console.error('Error creating user:', error)
            return new Response(JSON.stringify({ error: 'Error creating user', details: error }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        }
    }

    return new Response(JSON.stringify({ message: 'Webhook processed', type: eventType }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    })
}