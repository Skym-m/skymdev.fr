export const FOOTER_SCENE_CONFIG = {
  camera: {
    fov: 40,
    near: 0.1,
    far: 120,
    basePosition: { x: 0, y: 1.94, z: 8.15 },
    lookAt: { x: 0, y: 0.46, z: -2.75 },
  },
  meadow: {
    width: 32,
    depth: 28,
    floorY: -1.42,
  },
  render: {
    maxDpr: 1.75,
    pinMinWidth: 900,
    pinMinHeight: 680,
  },
  scroll: {
    pinnedEnd: "+=140%",
    fluidStart: "top bottom",
    fluidEnd: "bottom top",
  },
  wind: {
    baseStrength: 0.2,
    maxStrength: 0.42,
    noiseScale: 0.16,
    driftSpeed: 0.11,
    frequency: 0.24,
  },
  grass: {
    counts: {
      desktop: 65000,
      laptop: 42000,
      mobile: 14000,
    },
    heightSegments: 8,
    widthSegments: 1,
  },
  fireflies: {
    counts: {
      desktop: 20,
      laptop: 16,
      mobile: 12,
    },
  },
  colors: {
    base: "#177a52",
    tip: "#3df59a",
    fogStart: "#081227",
    fogEnd: "#0d5141",
    ground: "#0d3427",
    firefly: "#f4ffb6",
  },
} as const

export type FooterSceneTier = "desktop" | "laptop" | "mobile"

export type FooterSceneProfile = {
  fireflyCount: number
  grassCount: number
  shouldPin: boolean
  tier: FooterSceneTier
}

export function getFooterSceneProfile(
  width: number,
  height: number,
  hasCoarsePointer: boolean,
) {
  const tier: FooterSceneTier =
    width >= 1400
      ? "desktop"
      : width >= 900
        ? "laptop"
        : "mobile"

  const shouldPin =
    width >= FOOTER_SCENE_CONFIG.render.pinMinWidth &&
    height >= FOOTER_SCENE_CONFIG.render.pinMinHeight &&
    (!hasCoarsePointer || width >= 1180)

  return {
    tier,
    grassCount: FOOTER_SCENE_CONFIG.grass.counts[tier],
    fireflyCount: FOOTER_SCENE_CONFIG.fireflies.counts[tier],
    shouldPin,
  } satisfies FooterSceneProfile
}
