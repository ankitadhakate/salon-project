import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { signup } from "@/app/auth/actions"
import { Flash } from "@/components/flash"
import { SignupMagicForm } from "@/components/magic-forms"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getSessionUser } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Create your salon account",
  robots: { index: false, follow: false },
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>
}) {
  const user = await getSessionUser()
  if (user) redirect("/dashboard")
  const sp = await searchParams
  const ref = sp.ref?.trim() ?? ""
  const safeRef = /^[A-Za-z0-9-]{0,32}$/.test(ref) ? ref : ""

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-4xl">Create your account</h1>
      <p className="mt-2 text-muted-foreground">
        Free during the early partner program. You&apos;ll choose a city and add the salon on the next screen.
      </p>
      <div className="mt-4">
        <Flash error={sp.error?.slice(0, 200)} />
      </div>
      <form action={signup} className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" required className="h-12 px-3 text-base md:text-base" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="h-12 px-3 text-base md:text-base" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="h-12 px-3 text-base md:text-base" />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="referralCode">Referral code</Label>
          <Input
            id="referralCode"
            name="referralCode"
            defaultValue={safeRef}
            placeholder="Optional"
            className="h-12 px-3 text-base md:text-base"
          />
          <p className="text-xs text-muted-foreground">
            If someone invited you, their code tells us which invite brought you in.
          </p>
        </div>
        <SubmitButton pendingLabel="Creating account…" className="h-12 text-base">
          Create account
        </SubmitButton>
      </form>
      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      <SignupMagicForm referralCode={safeRef} />
      <p className="mt-6 text-sm">
        Already listed?{" "}
        <Link href="/login" className="font-medium text-primary">
          Log in
        </Link>
      </p>
    </div>
  )
}
