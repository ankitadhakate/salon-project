import nodemailer from "nodemailer"
import { siteName } from "@/lib/site"

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST)
}

export async function sendClaimMail(to: string, salonName: string, url: string) {
  const port = Number(process.env.SMTP_PORT || 587)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  const name = siteName()
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `${name} <no-reply@localhost>`,
    to,
    subject: `Claim ${salonName} on ${name}`,
    text: `A listing for ${salonName} is ready for you on ${name}. Open this link to verify and take it over. It expires in 7 days.\n\n${url}\n\nIf you weren't expecting this, ignore the email.`,
  })
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
  const name = siteName()
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `${name} <no-reply@localhost>`,
    to,
    subject: `Your ${name} sign-in link`,
    text: `Use this link to sign in to ${name}. It expires in 30 minutes.\n\n${url}\n\nIf you didn't ask for this, ignore this email.`,
  })
}
