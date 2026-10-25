import { chromium } from "playwright"

const base = process.env.APP_URL || "http://127.0.0.1:3847"
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
})

async function locationGranted() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    geolocation: { latitude: 18.559, longitude: 73.7868 },
    permissions: ["geolocation"],
  })
  const page = await context.newPage()
  await page.goto(`${base}/`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Use my location" }).click()
  await page.waitForURL(/lat=/, { timeout: 10000 })
  await page.getByText(/\d+(\.\d+)? km|\d+ m/).first().waitFor({ timeout: 10000 })
  await context.close()
  console.log("location granted ok")
}

async function locationDenied() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await page.goto(`${base}/`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Use my location" }).click()
  await page.getByLabel("Neighbourhood or city").waitFor({ timeout: 10000 })
  await page.getByText(/Location access is off|couldn't share a location|couldn't read your location/).waitFor()
  await context.close()
  console.log("location denied ok")
}

async function searchFilters() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto(`${base}/search?q=haircut`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Filters" }).click()
  await page.getByRole("heading", { name: "Filters" }).waitFor()
  await page.locator("select[name='price']").last().selectOption("under-500")
  await page.getByRole("button", { name: "Apply filters" }).click()
  await page.waitForURL(/price=under-500/)
  await page.getByRole("link", { name: /Under/ }).waitFor()
  await context.close()
  console.log("search filters ok")
}

try {
  await locationGranted()
  await locationDenied()
  await searchFilters()
} finally {
  await browser.close()
}
