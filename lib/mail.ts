import nodemailer from "nodemailer"

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST)
}

export async function sendSignInMail(to: string, url: string) {
  const port = Number(process.env.SMTP_PORT || 587)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "Saj <no-reply@saj.local>",
    to,
    subject: "Your Saj sign-in link",
    text: `Use this link to sign in to Saj. It expires in 30 minutes.\n\n${url}\n\nIf you didn't ask for this, ignore this email.`,
  })
}
