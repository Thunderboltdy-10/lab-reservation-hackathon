import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/server/db";
import type { WebhookEvent } from "@clerk/nextjs/server";

export const POST = async (req: Request) => {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const body = await req.text();

  // Get the webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Error occurred -- missing webhook secret", {
      status: 500,
    });
  }

  // Create a new Svix instance with your secret.
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred -- invalid signature", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    const emailAddress = email_addresses[0]?.email_address;

    if (!emailAddress) {
      return new Response("Error occurred -- no email address", {
        status: 400,
      });
    }

    await db.user.upsert({
      where: { id },
      update: {
        email: emailAddress,
        firstName: first_name ?? "",
        lastName: last_name ?? "",
      },
      create: {
        id,
        email: emailAddress,
        firstName: first_name ?? "",
        lastName: last_name ?? "",
      },
    });

    console.log("User created via webhook:", id);
  }

  return new Response("Webhook processed successfully", { status: 200 });
};
