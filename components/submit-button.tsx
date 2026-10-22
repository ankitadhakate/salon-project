"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "default",
  className,
  disabled = false,
}: {
  children: React.ReactNode
  pendingLabel?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      className={className ?? "h-11 px-4 text-base"}
    >
      {pending ? pendingLabel : children}
    </Button>
  )
}
