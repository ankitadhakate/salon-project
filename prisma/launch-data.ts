/** First launch city. Runtime pages read the database, not this file. */
export const LAUNCH_CITY = {
  slug: "pune",
  name: "Pune",
  countryCode: "IN",
  dialCode: "91",
  timezone: "Asia/Kolkata",
  sortOrder: 0,
}

export const LAUNCH_LOCALITIES: { slug: string; name: string }[] = [
  { slug: "baner", name: "Baner" },
  { slug: "aundh", name: "Aundh" },
  { slug: "balewadi", name: "Balewadi" },
  { slug: "pashan", name: "Pashan" },
  { slug: "bavdhan", name: "Bavdhan" },
  { slug: "kothrud", name: "Kothrud" },
  { slug: "karve-nagar", name: "Karve Nagar" },
  { slug: "erandwane", name: "Erandwane" },
  { slug: "prabhat-road", name: "Prabhat Road" },
  { slug: "deccan", name: "Deccan" },
  { slug: "fc-road", name: "FC Road" },
  { slug: "shivajinagar", name: "Shivajinagar" },
  { slug: "model-colony", name: "Model Colony" },
  { slug: "camp", name: "Camp" },
  { slug: "swargate", name: "Swargate" },
  { slug: "koregaon-park", name: "Koregaon Park" },
  { slug: "kalyani-nagar", name: "Kalyani Nagar" },
  { slug: "viman-nagar", name: "Viman Nagar" },
  { slug: "kharadi", name: "Kharadi" },
  { slug: "hadapsar", name: "Hadapsar" },
  { slug: "magarpatta", name: "Magarpatta" },
  { slug: "wanowrie", name: "Wanowrie" },
  { slug: "nibm", name: "NIBM" },
  { slug: "kondhwa", name: "Kondhwa" },
  { slug: "sinhagad-road", name: "Sinhagad Road" },
  { slug: "wakad", name: "Wakad" },
  { slug: "hinjewadi", name: "Hinjewadi" },
  { slug: "pimple-saudagar", name: "Pimple Saudagar" },
  { slug: "pimpri", name: "Pimpri" },
  { slug: "chinchwad", name: "Chinchwad" },
]

/** Service pages start with an empty intro, so they stay out of the index until the team writes one. */
export const LAUNCH_SERVICES: { slug: string; name: string; query: string }[] = [
  { slug: "haircut", name: "Haircut", query: "haircut" },
  { slug: "facial", name: "Facial", query: "facial" },
  { slug: "bridal-makeup", name: "Bridal makeup", query: "bridal makeup" },
  { slug: "beard-trim", name: "Beard trim", query: "beard trim" },
  { slug: "hair-colour", name: "Hair colour", query: "hair colour" },
  { slug: "manicure", name: "Manicure", query: "manicure" },
]
