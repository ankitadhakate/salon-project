const BOT_UA =
  /bot\b|crawler|spider|slurp|headless|phantom|scrapy|wget|curl\/|python-requests|go-http-client|axios\/|postman|facebookexternalhit|embedly|bingpreview|yandex|baiduspider|duckduckbot|semrush|ahrefs|petalbot|gptbot|claudebot|bytespider|amazonbot|applebot|linkedinbot|discordbot|slackbot|telegrambot|skypeuripreview|previewbot/i

/** True for empty, tiny, or known crawler user agents. Real mobile browsers are kept. */
export function isBotUserAgent(ua: string | null | undefined) {
  if (!ua) return true
  const value = ua.trim()
  if (value.length < 20) return true
  if (!/mozilla|opera/i.test(value) && /whatsapp/i.test(value)) return true
  return BOT_UA.test(value)
}
