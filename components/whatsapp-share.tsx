import { whatsAppShareHref } from "@/lib/format"

export function WhatsAppShare({ message }: { message: string }) {
  return (
    <a
      href={whatsAppShareHref(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 items-center rounded-full border border-border bg-card px-3 text-sm font-medium"
    >
      Share on WhatsApp
    </a>
  )
}
