function esc(value: string) {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === "&") return "&amp;"
    if (char === "<") return "&lt;"
    if (char === ">") return "&gt;"
    return "&quot;"
  })
}

export function demoCoverSvg(opts: {
  title: string
  place: string
  from: string
  a: string
  b: string
  ink: string
  variant: 1 | 2
}) {
  const title = esc(opts.title)
  const place = esc(opts.place)
  const from = esc(opts.from)
  const size = opts.title.length > 18 ? 58 : 72
  const motif =
    opts.variant === 1
      ? `<g fill="none" stroke="${opts.ink}" stroke-width="3" opacity="0.45">
          <rect x="78" y="150" width="150" height="210" rx="75"/>
          <path d="M153 150 v-36 M118 114 h70"/>
          <circle cx="153" cy="250" r="28"/>
        </g>`
      : `<g fill="${opts.ink}" opacity="0.12">
          <circle cx="980" cy="180" r="180"/>
          <circle cx="160" cy="640" r="200"/>
        </g>
        <text x="80" y="430" fill="${opts.ink}" font-family="Georgia, serif" font-size="64">${from}</text>`

  const headline =
    opts.variant === 1
      ? `<text x="80" y="470" fill="${opts.ink}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}">${title}</text>
         <text x="80" y="530" fill="${opts.ink}" opacity="0.75" font-family="Georgia, serif" font-size="28">${place}</text>
         <text x="80" y="590" fill="${opts.ink}" font-family="ui-sans-serif, sans-serif" font-size="24">${from}</text>`
      : `<text x="80" y="520" fill="${opts.ink}" font-family="Georgia, serif" font-size="42">${title}</text>
         <text x="80" y="580" fill="${opts.ink}" opacity="0.8" font-family="ui-sans-serif, sans-serif" font-size="24">Sample artwork, not a photograph</text>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${opts.a}"/>
      <stop offset="100%" stop-color="${opts.b}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  ${motif}
  <text x="80" y="96" fill="${opts.ink}" font-family="ui-sans-serif, sans-serif" font-size="18" letter-spacing="6">SAMPLE LISTING</text>
  ${headline}
</svg>`
}
