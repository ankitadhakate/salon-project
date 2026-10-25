import { chromium } from "playwright"

const base = process.env.APP_URL || "http://127.0.0.1:3847"
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
})

async function assertHeroStack(page, { field }) {
  const stack = await page.evaluate(() => {
    const box = (node) => {
      if (!node) return null
      const rect = node.getBoundingClientRect()
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width }
    }
    const search = document.querySelector("[role='combobox']")
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent?.trim() === "Search")
    const cta = document.querySelector(".hero-list-cta")
    const area = [...document.querySelectorAll("label")].find((node) => node.textContent?.trim() === "Area or city")
    const areaInput = area ? document.getElementById(area.htmlFor) : null
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      headerListing: Boolean(document.querySelector(".site-header")?.textContent?.includes("List your salon free")),
      search: box(search),
      button: box(button),
      cta: box(cta),
      area: box(areaInput),
    }
  })
  if (stack.scrollWidth !== stack.innerWidth) throw new Error(`hero overflow ${stack.scrollWidth}`)
  if (stack.headerListing) throw new Error("listing call to action is still in the header")
  if (!stack.search || !stack.button || !stack.cta) throw new Error("hero stack is missing a control")
  if (stack.button.top < stack.search.bottom - 1) throw new Error("Search button is not below the search bar")
  if (stack.cta.top < stack.button.bottom - 1) throw new Error("listing call to action is not below Search")
  const searchMid = (stack.search.left + stack.search.right) / 2
  const buttonMid = (stack.button.left + stack.button.right) / 2
  if (Math.abs(searchMid - buttonMid) > 2) throw new Error("Search button is not centred under the bar")
  if (stack.innerWidth < 640 && stack.button.width < stack.search.width - 2) {
    throw new Error("Search button is not full width on a phone")
  }
  if (stack.innerWidth >= 640 && stack.button.width > stack.search.width - 40) {
    throw new Error("Search button should be an auto-width pill on desktop")
  }
  if (field) {
    if (!stack.area) throw new Error("location field missing")
    if (stack.search.top < stack.area.bottom - 1) throw new Error("search bar is not below the location field")
  }
}

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
  await page.locator(".hero-list-cta").waitFor()
  await assertHeroStack(page, { field: false })
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
  await page.locator(".hero-list-cta").waitFor()
  await assertHeroStack(page, { field: true })
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
