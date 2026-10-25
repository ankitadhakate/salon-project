import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import bcrypt from "bcryptjs"
import { loadEnv } from "./load-env"
import { demoCoverSvg } from "./demo-art"
import { LAUNCH_CITY, LAUNCH_LOCALITIES, LAUNCH_SERVICES } from "./launch-data"

loadEnv()

type DemoService = {
  category: string
  name: string
  priceInr: number
  durationMin: number
}

type DemoSalon = {
  slug: string
  name: string
  areaSlug: string
  address: string
  gender: "MEN" | "WOMEN" | "UNISEX"
  description: string
  referralCode: string | null
  ownerEmail: string
  ownerName: string
  closedDays: number[]
  open: string
  close: string
  sunday?: { open: string; close: string }
  services: DemoService[]
  palette: { a: string; b: string; ink: string }
}

const DEMO_PINS: Record<string, { latitude: number; longitude: number }> = {
  "saffron-atelier": { latitude: 18.5362, longitude: 73.8939 },
  "the-monday-chair": { latitude: 18.559, longitude: 73.7868 },
  "meher-and-co": { latitude: 18.5074, longitude: 73.8077 },
  "glow-theory": { latitude: 18.5679, longitude: 73.9143 },
  "westend-grooming": { latitude: 18.5913, longitude: 73.7389 },
  "aundh-house": { latitude: 18.5606, longitude: 73.8102 },
  "palm-and-petal": { latitude: 18.5511, longitude: 73.9348 },
  "jm-road-cut": { latitude: 18.5314, longitude: 73.8476 },
  "wakad-clippers": { latitude: 18.5987, longitude: 73.764 },
}

// Fictional businesses for local development. Not real salons.
// Remove them with: npm run db:clear-demo
const DEMOS: DemoSalon[] = [
  {
    slug: "saffron-atelier",
    name: "Saffron Atelier",
    areaSlug: "koregaon-park",
    address: "14, Lane 7, Sample Studio, Koregaon Park, Pune 411001",
    gender: "WOMEN",
    referralCode: "PARK-LAUNCH",
    ownerEmail: "demo-owner@saj.local",
    ownerName: "Demo Owner",
    description:
      "Sample listing for the Saj demo. A fictional Koregaon Park studio for colour, skin, and bridal trials. None of these prices or phone numbers are real.",
    closedDays: [0],
    open: "11:00",
    close: "20:00",
    services: [
      { category: "Hair", name: "Haircut and blowdry", priceInr: 1500, durationMin: 75 },
      { category: "Hair", name: "Hair colour", priceInr: 4500, durationMin: 150 },
      { category: "Hair", name: "Hair spa", priceInr: 2200, durationMin: 60 },
      { category: "Skin", name: "Classic facial", priceInr: 1800, durationMin: 60 },
      { category: "Skin", name: "Cleanup", priceInr: 900, durationMin: 40 },
      { category: "Makeup", name: "Party makeup", priceInr: 4500, durationMin: 90 },
      { category: "Makeup", name: "Bridal makeup", priceInr: 28000, durationMin: 180 },
      { category: "Nails", name: "Manicure", priceInr: 800, durationMin: 40 },
    ],
    palette: { a: "#8C3A2E", b: "#E7B15A", ink: "#FFF8F1" },
  },
  {
    slug: "the-monday-chair",
    name: "The Monday Chair",
    areaSlug: "baner",
    address: "Shop 3, Sample Arcade, Baner Road, Pune 411045",
    gender: "MEN",
    referralCode: "BANER-01",
    ownerEmail: "sample.baner@saj.local",
    ownerName: "Sample Baner",
    description:
      "Sample listing. A fictional men's chair in Baner for cuts, fades, and beard work. Not a real business.",
    closedDays: [],
    open: "10:00",
    close: "21:00",
    services: [
      { category: "Hair", name: "Haircut", priceInr: 350, durationMin: 30 },
      { category: "Hair", name: "Skin fade", priceInr: 500, durationMin: 45 },
      { category: "Grooming", name: "Beard trim", priceInr: 150, durationMin: 20 },
      { category: "Grooming", name: "Haircut and beard", priceInr: 450, durationMin: 45 },
      { category: "Hair", name: "Hair colour", priceInr: 1800, durationMin: 75 },
      { category: "Spa", name: "Head massage", priceInr: 400, durationMin: 20 },
    ],
    palette: { a: "#1E3A34", b: "#8FA89A", ink: "#F4F7F5" },
  },
  {
    slug: "meher-and-co",
    name: "Meher & Co.",
    areaSlug: "kothrud",
    address: "202, Sample Plaza, Karve Road, Kothrud, Pune 411038",
    gender: "UNISEX",
    referralCode: null,
    ownerEmail: "sample.kothrud@saj.local",
    ownerName: "Sample Kothrud",
    description:
      "Sample listing. A fictional unisex salon in Kothrud. Prices below are made up for the demo.",
    closedDays: [],
    open: "10:00",
    close: "20:00",
    sunday: { open: "10:00", close: "16:00" },
    services: [
      { category: "Hair", name: "Women's haircut", priceInr: 700, durationMin: 45 },
      { category: "Hair", name: "Men's haircut", priceInr: 300, durationMin: 30 },
      { category: "Skin", name: "Facial", priceInr: 1200, durationMin: 60 },
      { category: "Waxing", name: "Full arms waxing", priceInr: 400, durationMin: 30 },
      { category: "Nails", name: "Pedicure", priceInr: 700, durationMin: 45 },
      { category: "Hair", name: "Hair spa", priceInr: 1500, durationMin: 60 },
    ],
    palette: { a: "#5C3A4E", b: "#D7A3B8", ink: "#FFF7FA" },
  },
  {
    slug: "glow-theory",
    name: "Glow Theory",
    areaSlug: "viman-nagar",
    address: "88, Sample Court, Datta Mandir Road, Viman Nagar, Pune 411014",
    gender: "WOMEN",
    referralCode: null,
    ownerEmail: "sample.viman@saj.local",
    ownerName: "Sample Viman",
    description:
      "Sample listing. A fictional skin and makeup studio in Viman Nagar. Not a real salon.",
    closedDays: [1],
    open: "11:00",
    close: "20:00",
    services: [
      { category: "Skin", name: "Brightening facial", priceInr: 2500, durationMin: 75 },
      { category: "Skin", name: "Cleanup", priceInr: 1100, durationMin: 40 },
      { category: "Skin", name: "De-tan", priceInr: 1500, durationMin: 45 },
      { category: "Grooming", name: "Threading", priceInr: 80, durationMin: 15 },
      { category: "Makeup", name: "Party makeup", priceInr: 5500, durationMin: 90 },
      { category: "Makeup", name: "Bridal makeup trial", priceInr: 8000, durationMin: 120 },
    ],
    palette: { a: "#C46B4A", b: "#F2D2C4", ink: "#3A241C" },
  },
  {
    slug: "westend-grooming",
    name: "Westend Grooming",
    areaSlug: "hinjewadi",
    address: "Unit 12, Sample Phase 1, Hinjewadi, Pune 411057",
    gender: "MEN",
    referralCode: null,
    ownerEmail: "sample.hinjewadi@saj.local",
    ownerName: "Sample Hinjewadi",
    description:
      "Sample listing. A fictional grooming room aimed at the Hinjewadi office crowd. Not a real business.",
    closedDays: [],
    open: "09:00",
    close: "21:00",
    services: [
      { category: "Hair", name: "Haircut", priceInr: 400, durationMin: 30 },
      { category: "Grooming", name: "Beard sculpt", priceInr: 250, durationMin: 25 },
      { category: "Skin", name: "De-tan cleanup", priceInr: 900, durationMin: 40 },
      { category: "Hair", name: "Hair spa", priceInr: 1200, durationMin: 45 },
      { category: "Hair", name: "Grey blend", priceInr: 1600, durationMin: 60 },
    ],
    palette: { a: "#243044", b: "#8AA0B8", ink: "#F7F9FB" },
  },
  {
    slug: "aundh-house",
    name: "Aundh House",
    areaSlug: "aundh",
    address: "5, Sample House, DP Road, Aundh, Pune 411007",
    gender: "UNISEX",
    referralCode: null,
    ownerEmail: "sample.aundh@saj.local",
    ownerName: "Sample Aundh",
    description:
      "Sample listing. A fictional colour-led salon in Aundh. The artwork is generated for the demo, not a photo of a shop.",
    closedDays: [6],
    open: "10:00",
    close: "20:00",
    services: [
      { category: "Hair", name: "Creative cut", priceInr: 1200, durationMin: 60 },
      { category: "Hair", name: "Men's haircut", priceInr: 500, durationMin: 40 },
      { category: "Hair", name: "Hair colour", priceInr: 5500, durationMin: 180 },
      { category: "Hair", name: "Keratin", priceInr: 7500, durationMin: 180 },
      { category: "Hair", name: "Blowdry", priceInr: 700, durationMin: 40 },
    ],
    palette: { a: "#3F4A32", b: "#C4B48A", ink: "#FBFAF4" },
  },
  {
    slug: "palm-and-petal",
    name: "Palm & Petal",
    areaSlug: "kharadi",
    address: "19, Sample Fountain, Kharadi, Pune 411014",
    gender: "WOMEN",
    referralCode: null,
    ownerEmail: "sample.kharadi@saj.local",
    ownerName: "Sample Kharadi",
    description:
      "Sample listing. A fictional nails and skin studio in Kharadi. Not a real salon.",
    closedDays: [2],
    open: "11:00",
    close: "20:00",
    services: [
      { category: "Nails", name: "Gel manicure", priceInr: 1400, durationMin: 60 },
      { category: "Nails", name: "Classic pedicure", priceInr: 900, durationMin: 50 },
      { category: "Nails", name: "Nail art", priceInr: 500, durationMin: 40 },
      { category: "Skin", name: "Cleanup", priceInr: 1000, durationMin: 40 },
      { category: "Skin", name: "Facial", priceInr: 2000, durationMin: 70 },
    ],
    palette: { a: "#7A3E4A", b: "#E7C1B8", ink: "#FFF8F6" },
  },
  {
    slug: "jm-road-cut",
    name: "JM Road Cut",
    areaSlug: "shivajinagar",
    address: "7, Sample Chambers, JM Road, Shivajinagar, Pune 411005",
    gender: "UNISEX",
    referralCode: null,
    ownerEmail: "sample.shivaji@saj.local",
    ownerName: "Sample Shivajinagar",
    description:
      "Sample listing. A fictional neighbourhood salon on JM Road. Prices are illustrative only.",
    closedDays: [],
    open: "09:00",
    close: "21:00",
    sunday: { open: "09:00", close: "14:00" },
    services: [
      { category: "Hair", name: "Haircut", priceInr: 250, durationMin: 25 },
      { category: "Grooming", name: "Shave", priceInr: 150, durationMin: 20 },
      { category: "Hair", name: "Women's haircut", priceInr: 500, durationMin: 40 },
      { category: "Skin", name: "Facial", priceInr: 800, durationMin: 45 },
      { category: "Hair", name: "Hair colour", priceInr: 1500, durationMin: 90 },
    ],
    palette: { a: "#6B3F2A", b: "#E6C7A3", ink: "#2A1C14" },
  },
  {
    slug: "wakad-clippers",
    name: "Wakad Clippers",
    areaSlug: "wakad",
    address: "Shop 8, Sample Main Road, Wakad, Pune 411057",
    gender: "MEN",
    referralCode: null,
    ownerEmail: "sample.wakad@saj.local",
    ownerName: "Sample Wakad",
    description:
      "Sample listing. A fictional men's shop in Wakad. Not a real business, and the number is not connected.",
    closedDays: [6],
    open: "10:00",
    close: "21:00",
    services: [
      { category: "Hair", name: "Haircut", priceInr: 300, durationMin: 30 },
      { category: "Grooming", name: "Beard trim", priceInr: 120, durationMin: 15 },
      { category: "Spa", name: "Head massage", priceInr: 300, durationMin: 20 },
      { category: "Hair", name: "Hair colour", priceInr: 1200, durationMin: 60 },
    ],
    palette: { a: "#1F3D4D", b: "#7EB0C4", ink: "#F4FBFD" },
  },
]

function hoursFor(demo: DemoSalon) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    if (demo.closedDays.includes(dayOfWeek)) {
      return { dayOfWeek, closed: true, openTime: demo.open, closeTime: demo.close }
    }
    if (dayOfWeek === 6 && demo.sunday) {
      return { dayOfWeek, closed: false, openTime: demo.sunday.open, closeTime: demo.sunday.close }
    }
    return { dayOfWeek, closed: false, openTime: demo.open, closeTime: demo.close }
  })
}

function searchBlob(demo: DemoSalon, areaName: string) {
  return [demo.name, areaName, demo.areaSlug, demo.address, demo.description, demo.gender, ...demo.services.flatMap((service) => [service.name, service.category])]
    .join(" ")
    .toLowerCase()
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "Refusing to seed while NODE_ENV=production. Production boot does not load cities or sample salons. The admin account is created by prisma/ensure-admin.ts. Add cities in the admin screen, and run npm run db:clear-demo before launch if sample rows were loaded earlier.",
    )
    process.exit(1)
  }
  const { isProduction } = await import("../lib/production")
  const { prisma } = await import("../lib/db")
  const demoPassword = isProduction() ? randomBytes(24).toString("base64url") : "saj-demo-owner"
  const passwordHash = await bcrypt.hash(demoPassword, 10)

  await prisma.city.upsert({
    where: { slug: LAUNCH_CITY.slug },
    update: {
      name: LAUNCH_CITY.name,
      countryCode: LAUNCH_CITY.countryCode,
      dialCode: LAUNCH_CITY.dialCode,
      timezone: LAUNCH_CITY.timezone,
      sortOrder: LAUNCH_CITY.sortOrder,
      active: true,
    },
    create: { ...LAUNCH_CITY, intro: "", active: true },
  })

  for (const [index, area] of LAUNCH_LOCALITIES.entries()) {
    await prisma.locality.upsert({
      where: { citySlug_slug: { citySlug: LAUNCH_CITY.slug, slug: area.slug } },
      update: { name: area.name, sortOrder: index },
      create: {
        citySlug: LAUNCH_CITY.slug,
        slug: area.slug,
        name: area.name,
        sortOrder: index,
        intro: "",
      },
    })
  }

  for (const [index, guide] of LAUNCH_SERVICES.entries()) {
    await prisma.serviceGuide.upsert({
      where: { citySlug_slug: { citySlug: LAUNCH_CITY.slug, slug: guide.slug } },
      update: { name: guide.name, query: guide.query, sortOrder: index },
      create: { citySlug: LAUNCH_CITY.slug, ...guide, sortOrder: index, intro: "" },
    })
  }

  const adminEmail = (process.env.ADMIN_EMAIL || (isProduction() ? "" : "admin@saj.local")).toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || (isProduction() ? "" : "saj-admin-dev")
  if (!adminEmail.includes("@") || adminPassword.length < 8) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding.")
  }
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: process.env.ADMIN_NAME || "Admin",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
      },
    })
    console.log(`Created admin ${adminEmail}`)
  } else if (process.env.SEED_RESET_ADMIN_PASSWORD === "true") {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 10) },
    })
    console.log(`Reset password for admin ${adminEmail}`)
  } else if (existingAdmin.role !== "ADMIN") {
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { role: "ADMIN" } })
  }

  await prisma.siteSetting.upsert({
    where: { key: "requireApproval" },
    update: {},
    create: {
      key: "requireApproval",
      value: process.env.AUTO_APPROVE_LISTINGS === "true" ? "false" : "true",
    },
  })

  const artDir = path.join(process.cwd(), "public", "demo")
  await mkdir(artDir, { recursive: true })

  for (const [index, demo] of DEMOS.entries()) {
    const area = LAUNCH_LOCALITIES.find((item) => item.slug === demo.areaSlug)
    if (!area) throw new Error(`Unknown area ${demo.areaSlug}`)
    const phone = `99999000${String(index + 1).padStart(2, "0")}`.slice(0, 10)

    await prisma.user.upsert({
      where: { email: demo.ownerEmail },
      update: { name: demo.ownerName, isDemo: true, referralCode: demo.referralCode },
      create: {
        email: demo.ownerEmail,
        name: demo.ownerName,
        passwordHash,
        role: "OWNER",
        isDemo: true,
        referralCode: demo.referralCode,
      },
    })
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: demo.ownerEmail } })
    const startingPrice = Math.min(...demo.services.map((service) => service.priceInr))
    const data = {
      name: demo.name,
      citySlug: LAUNCH_CITY.slug,
      areaSlug: demo.areaSlug,
      address: demo.address,
      description: demo.description,
      phone,
      whatsapp: phone,
      gender: demo.gender,
      status: "LIVE",
      isEarlyPartner: true,
      isDemo: true,
      referralCode: demo.referralCode,
      startingPrice,
      searchBlob: searchBlob(demo, `${area.name} ${LAUNCH_CITY.name}`),
      latitude: DEMO_PINS[demo.slug].latitude,
      longitude: DEMO_PINS[demo.slug].longitude,
    }

    const existing = await prisma.salon.findUnique({
      where: {
        citySlug_areaSlug_slug: {
          citySlug: LAUNCH_CITY.slug,
          areaSlug: demo.areaSlug,
          slug: demo.slug,
        },
      },
    })
    const salon = existing
      ? await prisma.salon.update({ where: { id: existing.id }, data })
      : await prisma.salon.create({
          data: { ...data, slug: demo.slug, ownerId: owner.id },
        })

    if (existing && existing.ownerId !== owner.id) {
      const taken = await prisma.salon.findUnique({ where: { ownerId: owner.id } })
      if (taken && taken.id !== salon.id) {
        throw new Error(`Demo owner ${demo.ownerEmail} already has a different salon.`)
      }
      await prisma.salon.update({ where: { id: salon.id }, data: { ownerId: owner.id } })
    }

    await prisma.service.deleteMany({ where: { salonId: salon.id } })
    await prisma.openingHour.deleteMany({ where: { salonId: salon.id } })
    await prisma.photo.deleteMany({ where: { salonId: salon.id } })
    await prisma.service.createMany({
      data: demo.services.map((service, sortOrder) => ({ ...service, salonId: salon.id, sortOrder })),
    })
    await prisma.openingHour.createMany({
      data: hoursFor(demo).map((row) => ({ ...row, salonId: salon.id })),
    })

    const from = `From ₹${startingPrice.toLocaleString("en-IN")}`
    for (const variant of [1, 2] as const) {
      const filename = `${demo.slug}-${variant}.svg`
      const svg = demoCoverSvg({
        title: demo.name,
        place: `${area.name}, ${LAUNCH_CITY.name}`,
        from,
        a: demo.palette.a,
        b: demo.palette.b,
        ink: demo.palette.ink,
        variant,
      })
      await writeFile(path.join(artDir, filename), svg)
      await prisma.photo.create({
        data: {
          salonId: salon.id,
          url: `/demo/${filename}`,
          storageKey: `demo/${filename}`,
          alt: `Sample illustration for ${demo.name}, not a photograph of a real salon`,
          sortOrder: variant,
        },
      })
    }
  }

  console.log(
    `Seeded ${LAUNCH_CITY.name} with ${LAUNCH_LOCALITIES.length} localities and ${DEMOS.length} sample salons.`,
  )
  if (!isProduction()) console.log("Demo owner: demo-owner@saj.local / saj-demo-owner")
  console.log(`Admin: ${adminEmail} (password set only when that user is first created)`)
  console.log("Remove sample listings with: npm run db:clear-demo")
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
