"use client"

import { useEffect } from "react"

/** Marks the document after a short scroll so the header can shrink without a layout library. */
export function ScrollHeader() {
  useEffect(() => {
    const root = document.documentElement
    function onScroll() {
      const next = window.scrollY > 24 ? "1" : "0"
      if (root.dataset.scrolled !== next) root.dataset.scrolled = next
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      delete root.dataset.scrolled
    }
  }, [])
  return null
}
