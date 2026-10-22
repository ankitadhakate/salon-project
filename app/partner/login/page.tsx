import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { login } from "@/app/auth/actions"
import { Flash } from "@/components/flash"
import { LoginMagicForm } from "@/components/magic-forms"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getSessionUser } from "@/lib/auth"
import { siteName } from "@/lib/site"
import { safeNextPath } from "@/lib/urls"

export const metadata: Metadata = {
  title: "Owner login",
  robots: { index: false, follow: false },
}

export default async function PartnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const user = await getSessionUser()
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/partner")
  const sp = await searchParams
  const next = safeNextPath(sp.next ?? "")
  const name = siteName()

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-4xl">Owner login</h1>
      <p className="mt-2 text-muted-foreground">
        Partner accounts for salon owners, and the {name} review desk. Customers browse without logging in.
      </p>
      <div className="mt-4">
        <Flash error={sp.error?.slice(0, 200)} />
      </div>
      <form action={login} className="mt-6 grid gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="h-12 px-3 text-base md:text-base" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-12 px-3 text-base md:text-base" />
        </div>
        <SubmitButton pendingLabel="Logging in…" className="h-12 text-base">
          Log in
        </SubmitButton>
      </form>
      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      <LoginMagicForm />
      <p className="mt-6 text-sm">
        New salon?{" "}
        <Link href="/partner/setup" className="font-medium text-primary">
          Start the 5-minute setup
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" ? (
        <aside className="mt-6 rounded-xl bg-secondary p-3 text-sm">
          <p className="font-medium">Development accounts</p>
          <p className="mt-1 text-muted-foreground">Owner: demo-owner@saj.local / saj-demo-owner</p>
          <p className="text-muted-foreground">Admin: admin@saj.local / saj-admin-dev</p>
        </aside>
      ) : null}
    </div>
  )
}
