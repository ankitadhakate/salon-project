const DEFAULT_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export function mapTileUrl() {
  return process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILES
}

export function mapTileAttribution() {
  return process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || DEFAULT_ATTRIBUTION
}
