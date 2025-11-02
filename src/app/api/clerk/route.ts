import { db } from "@/server/db"

export const POST = async (req: Request) => {
    const {data} = await req.json()
    console.log("clerk webhook received", data)

    const emailAddress = data.email_addresses[0].email_address
    const firstName = data.first_name
    const lastName = data.last_name
    const id = data.id

    await db.user.create({
        data: {
            id,
            email: emailAddress,
            firstName,
            lastName,
        }
    })
    
    return new Response("Webhook received", {status: 200})
}