export type HeaderAccount = { role: string } | null

export type HeaderLink =
  | { kind: "link"; label: "Login" | "Dashboard"; href: string }
  | { kind: "logout"; label: "Log out" }

/** Signed-out pages only offer Login. Signed-in pages offer Dashboard and Log out. */
export function headerSessionLinks(user: HeaderAccount): HeaderLink[] {
  if (!user) return [{ kind: "link", label: "Login", href: "/partner/login" }]
  return [
    {
      kind: "link",
      label: "Dashboard",
      href: user.role === "ADMIN" ? "/admin" : "/dashboard",
    },
    { kind: "logout", label: "Log out" },
  ]
}
