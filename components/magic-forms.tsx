"use client"

import { useActionState } from "react"
import { requestLoginLink, requestSignupLink, type MagicState } from "@/app/auth/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

function MagicResult({ state }: { state: MagicState }) {
  if (!state) return null
  return (
    <div className="grid gap-2">
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      ) : null}
      {state.devLink ? (
        <a href={state.devLink} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Open your sign-in link
        </a>
      ) : null}
    </div>
  )
}

export function LoginMagicForm() {
  const [state, action, pending] = useActionState(requestLoginLink, null)
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 px-3 text-base md:text-base"
        />
      </div>
      <MagicResult state={state} />
      <Button type="submit" variant="outline" disabled={pending} className="h-11 text-base">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  )
}

export function SignupMagicForm({ referralCode }: { referralCode?: string }) {
  const [state, action, pending] = useActionState(requestSignupLink, null)
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="magic-name">Your name</Label>
        <Input id="magic-name" name="name" required className="h-12 px-3 text-base md:text-base" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="magic-signup-email">Email</Label>
        <Input
          id="magic-signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 px-3 text-base md:text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="magic-ref">Referral code, if you have one</Label>
        <Input
          id="magic-ref"
          name="referralCode"
          defaultValue={referralCode ?? ""}
          className="h-12 px-3 text-base md:text-base"
        />
      </div>
      <MagicResult state={state} />
      <Button type="submit" variant="outline" disabled={pending} className="h-11 text-base">
        {pending ? "Sending…" : "Email me a link instead"}
      </Button>
    </form>
  )
}
