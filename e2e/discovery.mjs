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
  await page.waitForURL(/lat=/, { timeout: 10000 })
  await page.getByText(/\d+(\.\d+)? km|\d+ m/).first().waitFor({ timeout: 10000 })
  await page.getByRole("combobox", { name: "Search salons, services, and areas" }).waitFor()
  if ((await page.getByLabel("Area or city").count()) !== 0) {
    throw new Error("granted location still shows the hero location field")
  }
  await context.close()
  console.log("location granted ok")
}

async function locationDenied() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await page.goto(`${base}/`, { waitUntil: "networkidle" })
  await page.getByLabel("Area or city").waitFor({ timeout: 10000 })
  await page.getByRole("combobox", { name: "Search salons, services, and areas" }).waitFor()
  await page.getByText(/Location access is off|Enter an area or city|took too long|can't share a location/).waitFor()
  await context.close()
  console.log("location denied ok")
}

async function locationPrompt() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.addInitScript(() => {
    const geo = navigator.geolocation
    window.__geoCalls = 0
    geo.getCurrentPosition = function () {
      window.__geoCalls += 1
    }
    const query = navigator.permissions?.query?.bind(navigator.permissions)
    if (navigator.permissions) {
      navigator.permissions.query = async (descriptor) => {
        if (descriptor && descriptor.name === "geolocation") {
          return { state: "prompt", addEventListener() {}, removeEventListener() {} }
        }
        return query ? query(descriptor) : { state: "prompt" }
      }
    }
  })
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" })
  await page.waitForFunction(() => window.__geoCalls > 0, null, { timeout: 5000 })
  await page.getByText("Detecting your location…").waitFor()
  await page.getByRole("combobox", { name: "Search salons, services, and areas" }).waitFor()
  if ((await page.getByLabel("Area or city").count()) !== 0) {
    throw new Error("location field flashed while detection was in progress")
  }
  await context.close()
  console.log("location prompt fires without a click")
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
  await locationPrompt()
  await searchFilters()
} finally {
  await browser.close()
}
