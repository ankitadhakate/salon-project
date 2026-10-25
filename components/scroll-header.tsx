"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/** Marks the document after a short scroll so the home header can blur over the hero. */
export function ScrollHeader() {
  const pathname = usePathname()
  useEffect(() => {
    const root = document.documentElement
    function sync() {
      const scrolled = window.scrollY > 24
      const next = scrolled ? "1" : "0"
      if (root.dataset.scrolled !== next) root.dataset.scrolled = next
      const header = document.querySelector(".site-header")
      header?.classList.toggle("backdrop-blur-md", scrolled && Boolean(document.querySelector(".home-hero")))
    }
    sync()
    window.addEventListener("scroll", sync, { passive: true })
    return () => {
      window.removeEventListener("scroll", sync)
      delete root.dataset.scrolled
      document.querySelector(".site-header")?.classList.remove("backdrop-blur-md")
    }
  }, [pathname])
  return null
}
