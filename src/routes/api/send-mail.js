import nodemailer from "nodemailer";

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
    const { name, email, message } = await request.json();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD, // Use an App Password if you have 2FA enabled
        },
    });

    try {
        await transporter.sendMail({
            from: email,
            to: process.env.EMAIL,
            subject: `New Contact from ${name}`,
            text: message,
        });

        return new Response(JSON.stringify({ success: true, message: "Email sent successfully!" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: "Failed to send email", error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
