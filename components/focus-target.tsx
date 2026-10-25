"use client"

import { useEffect } from "react"

export function FocusTarget({ selector }: { selector: string }) {
  useEffect(() => {
    const node = document.querySelector(selector)
    if (node instanceof HTMLElement) node.focus()
  }, [selector])
  return null
}
