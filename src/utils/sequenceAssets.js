// Centralized sequence asset lists (stable references).

export const HORSE_LOADING_FRAMES = (() => {
  const pngs = import.meta.glob('../assets/horse_loading/horse_*.png', { eager: true, import: 'default' })
  return Object.keys(pngs)
    .sort()
    .map((key) => pngs[key])
})()

export const STICK_FRAMES = (() => {
  const pngs = import.meta.glob('../assets/stick/stick*.png', { eager: true, import: 'default' })
  const webps = import.meta.glob('../assets/stick/stick*.webp', { eager: true, import: 'default' })
  const merged = { ...pngs, ...webps }
  return Object.keys(merged)
    .sort()
    .map((key) => merged[key])
})()

export const RADIEN_STICK_FRAMES = (() => {
  const pngs = import.meta.glob('../assets/radien_stick_animation/radien_*.png', { eager: true, import: 'default' })
  const webps = import.meta.glob('../assets/radien_stick_animation/radien_*.webp', { eager: true, import: 'default' })
  const merged = { ...pngs, ...webps }
  return Object.keys(merged)
    .sort()
    .map((key) => merged[key])
})()


