import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8")

function token(name: string) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  assert.ok(match, `${name} is a hex token`)
  return match[1].toLowerCase()
}

function channel(hex: string, shift: number) {
  const value = parseInt(hex.slice(1), 16) >> shift & 255
  const unit = value / 255
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  return 0.2126 * channel(hex, 16) + 0.7152 * channel(hex, 8) + 0.0722 * channel(hex, 0)
}

function ratio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function over(foreground: string, background: string, alpha: number) {
  const mix = (shift: number) => {
    const fg = (parseInt(foreground.slice(1), 16) >> shift) & 255
    const bg = (parseInt(background.slice(1), 16) >> shift) & 255
    return Math.round(fg * alpha + bg * (1 - alpha))
  }
  return `#${[16, 8, 0].map((shift) => mix(shift).toString(16).padStart(2, "0")).join("")}`
}

test("text and background pairs meet WCAG AA 4.5:1", () => {
  const ink = token("--brand-ink")
  const cream = token("--brand-cream")
  const blush = token("--brand-blush")
  const blushSoft = token("--brand-blush-soft")
  const mustard = token("--brand-mustard")
  const sage = token("--brand-sage")
  const sageSoft = token("--brand-sage-soft")
  const sageInk = token("--brand-sage-ink")
  const coral = token("--brand-coral")
  const button = token("--brand-coral-button")
  const hover = token("--brand-coral-hover")
  const muted = token("--brand-muted")
  const whatsapp = token("--brand-whatsapp")
  const white = "#ffffff"
  const destructive = token("--destructive")
  const pairs: Array<[string, string, string]> = [
    ["ink on cream", ink, cream],
    ["ink on white cards", ink, white],
    ["ink on blush", ink, blush],
    ["ink on soft blush", ink, blushSoft],
    ["ink on mustard", ink, mustard],
    ["ink on sage chips", ink, sage],
    ["ink on brand coral", ink, coral],
    ["ink on soft sage", ink, sageSoft],
    ["sage ink on cream", sageInk, cream],
    ["sage ink on white", sageInk, white],
    ["sage ink on blush", sageInk, blush],
    ["sage ink on soft blush", sageInk, blushSoft],
    ["sage ink on soft sage", sageInk, sageSoft],
    ["muted text on cream", muted, cream],
    ["muted text on white", muted, white],
    ["muted text on blush", muted, blush],
    ["muted text on soft blush", muted, blushSoft],
    ["muted text on soft sage", muted, sageSoft],
    ["muted text on mustard", muted, mustard],
    ["white on coral button", white, button],
    ["white on coral hover", white, hover],
    ["white on WhatsApp", white, whatsapp],
    ["destructive text on white", destructive, white],
    ["destructive text on cream", destructive, cream],
    ["destructive text on a 10% tint", destructive, over(destructive, white, 0.1)],
  ]
  for (const [label, foreground, background] of pairs) {
    const score = ratio(foreground, background)
    assert.ok(score >= 4.5, `${label}: ${foreground} on ${background} is ${score.toFixed(2)}`)
  }
  assert.ok(ratio(white, coral) < 4.5)
  assert.ok(ratio("#4f6f67", blush) < 4.5)
})
