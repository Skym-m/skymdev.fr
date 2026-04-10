'use client'

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import {
  FOOTER_SCENE_CONFIG,
  getFooterSceneProfile,
} from "./footerSceneConfig"
import {
  createGrassUniforms,
  grassFragmentShader,
  grassVertexShader,
} from "./footerShaders"

gsap.registerPlugin(ScrollTrigger)

const fireflyVertexShader = `
attribute float aAlpha;
attribute float aScale;

varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float pointSize = aScale * (240.0 / max(-mvPosition.z, 0.001));

  vAlpha = aAlpha;
  gl_PointSize = clamp(pointSize, 8.0, 34.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

const fireflyFragmentShader = `
uniform vec3 uColor;

varying float vAlpha;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float distanceToCenter = dot(centered, centered);
  float halo = 1.0 - smoothstep(0.0, 0.26, distanceToCenter);
  float core = 1.0 - smoothstep(0.0, 0.05, distanceToCenter);
  float alpha = max(halo * 0.75, core) * vAlpha;

  if (alpha < 0.01) {
    discard;
  }

  gl_FragColor = vec4(uColor, alpha);
}
`

export type FooterSceneCanvasProps = {
  reducedMotion: boolean
}

type FireflyMaterial = THREE.ShaderMaterial
type FireflyPoints = THREE.Points<THREE.BufferGeometry, FireflyMaterial>
type GrassMaterial = THREE.ShaderMaterial
type GrassMesh = THREE.InstancedMesh<THREE.PlaneGeometry, GrassMaterial>
type TerrainMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>

type FireflyData = {
  altitudeMax: number
  altitudeMin: number
  baseOpacity: number
  baseScale: number
  drift: number
  phase: number
  travelX: number
  travelZ: number
  twinkle: number
  x: number
  y: number
  z: number
}

type FireflySystem = {
  alphas: Float32Array
  data: FireflyData[]
  geometry: THREE.BufferGeometry
  material: FireflyMaterial
  points: FireflyPoints
  positions: Float32Array
  scales: Float32Array
}

type GrassInstanceData = {
  color: THREE.Color
  height: number
  lean: number
  rotationY: number
  seed: number
  tiltX: number
  tiltZ: number
  width: number
  x: number
  y: number
  z: number
}

type GrassLayer = "meadow" | "foreground"

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function fract(value: number) {
  return value - Math.floor(value)
}

function hash2(x: number, y: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123)
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

function valueNoise2D(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = smoothstep(x - ix)
  const fy = smoothstep(y - iy)

  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)

  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy)
}

function fbm2D(x: number, y: number) {
  let value = 0
  let amplitude = 0.5
  let frequency = 1

  for (let index = 0; index < 4; index += 1) {
    value += amplitude * valueNoise2D(x * frequency, y * frequency)
    frequency *= 2.03
    amplitude *= 0.5
  }

  return value
}

function createRandom(seed: number) {
  return function next() {
    let current = seed += 0x6d2b79f5
    current = Math.imul(current ^ (current >>> 15), current | 1)
    current ^= current + Math.imul(current ^ (current >>> 7), current | 61)
    return ((current ^ (current >>> 14)) >>> 0) / 4294967296
  }
}

function supportsWebGL() {
  const canvas = document.createElement("canvas")

  return Boolean(
    canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }),
  )
}

function sampleTerrain(x: number, z: number) {
  const halfWidth = FOOTER_SCENE_CONFIG.meadow.width * 0.5
  const lane = clamp((z + 3.8) / (FOOTER_SCENE_CONFIG.meadow.depth + 6.2), 0, 1)
  const centerOffset =
    (valueNoise2D(z * 0.07 + 2.4, 1.9) - 0.5) * lerp(0.8, 2.4, lane) +
    (valueNoise2D(z * 0.16 - 4.7, 6.3) - 0.5) * lerp(0.2, 0.9, lane)
  const shiftedX = x - centerOffset
  const normalizedX = clamp(shiftedX / halfWidth, -1, 1)
  const asymmetry =
    (valueNoise2D(z * 0.09 + 7.1, 2.8) - 0.5) * 0.12 +
    (valueNoise2D(z * 0.23 - 3.2, 5.4) - 0.5) * 0.08
  const valleyWidth = lerp(0.1, 0.26, lane) * (1 + asymmetry)
  const centerDistance = Math.abs(normalizedX)
  const slopeRatio = clamp(
    Math.max(centerDistance - valleyWidth, 0) / Math.max(1 - valleyWidth, 0.0001),
    0,
    1,
  )
  const centerChannel = Math.max(1 - centerDistance / Math.max(valleyWidth, 0.0001), 0)
  const sideBias = normalizedX > 0 ? 1.18 : 0.86
  const ridgeLift = Math.pow(slopeRatio, 1.16) * lerp(0.38, 2.05, lane) * sideBias
  const valleyDip = -centerChannel * lerp(0.08, 0.38, lane)
  const rolling =
    (valueNoise2D(x * 0.05 + 4.2, z * 0.05 - 2.4) - 0.5) * 0.06 +
    (valueNoise2D(x * 0.11 - 7.4, z * 0.08 + 5.8) - 0.5) * 0.022 +
    (valueNoise2D(x * 0.19 + 2.1, z * 0.15 - 6.4) - 0.5) * 0.04
  const height =
    FOOTER_SCENE_CONFIG.meadow.floorY +
    lane * 0.76 +
    ridgeLift +
    valleyDip +
    rolling

  return {
    centerChannel,
    centerDistance,
    centerOffset,
    height,
    lane,
    normalizedX,
    slopeRatio,
    valleyWidth,
  }
}

function getTerrainHeight(x: number, z: number) {
  return sampleTerrain(x, z).height
}

function createGrassInstances(count: number, layer: GrassLayer) {
  const random = createRandom(layer === "foreground" ? 18917 : 8731)
  const instances: GrassInstanceData[] = []
  const halfWidth =
    FOOTER_SCENE_CONFIG.meadow.width * 0.5 + (layer === "foreground" ? 0.6 : 4.2)
  const zStart = -4.8
  const zEnd = FOOTER_SCENE_CONFIG.meadow.depth + 1.6
  const depth = zEnd - zStart
  const aspect = (halfWidth * 2) / depth
  const columns = Math.max(Math.floor(Math.sqrt(count * aspect)), 1)
  const rows = Math.max(Math.ceil(count / columns), 1)
  const cellWidth = (halfWidth * 2) / columns
  const cellDepth = depth / rows

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns)
    const column = index % columns
    const jitterX = lerp(-0.46, 0.46, random()) * cellWidth
    const jitterZ = lerp(-0.46, 0.46, random()) * cellDepth
    const x = clamp(
      -halfWidth + (column + 0.5) * cellWidth + jitterX,
      -halfWidth,
      halfWidth,
    )
    const zBase = zStart + (row + 0.5) * cellDepth
    const z = clamp(zBase + jitterZ, zStart, zEnd)
    const lane = clamp((z - zStart) / Math.max(depth, 0.0001), 0, 1)
    const frontFactor = 1 - lane
    const slopeDirection = x === 0 ? 1 : Math.sign(x)
    const centerBlend = Math.abs(x) / Math.max(halfWidth, 0.0001)
    const laneVariation = 0.84 + random() * 0.32

    const width =
      (layer === "foreground" ? lerp(0.07, 0.15, random()) : lerp(0.045, 0.12, random())) *
      lerp(layer === "foreground" ? 1.22 : 1.14, layer === "foreground" ? 0.92 : 1.01, lane) *
      lerp(0.94, 1.06, centerBlend)
    const height =
      lerp(layer === "foreground" ? 0.38 : 0.28, layer === "foreground" ? 2.15 : 1.78, frontFactor) *
      lerp(0.62, layer === "foreground" ? 1.34 : 1.24, random()) *
      laneVariation
    const baseColor = new THREE.Color(FOOTER_SCENE_CONFIG.colors.base)

    baseColor.offsetHSL(
      lerp(-0.02, 0.026, random()),
      lerp(layer === "foreground" ? -0.04 : -0.08, 0.05, random()),
      lerp(layer === "foreground" ? -0.05 : -0.08, layer === "foreground" ? 0.13 : 0.09, random()),
    )

    instances.push({
      x,
      y: getTerrainHeight(x, z),
      z,
      width,
      height,
      seed: random(),
      lean: lerp(layer === "foreground" ? 0.96 : 0.88, layer === "foreground" ? 1.34 : 1.24, random()),
      rotationY: lerp(-Math.PI, Math.PI, random()),
      tiltX: lerp(-0.05, layer === "foreground" ? 0.07 : 0.04, random()),
      tiltZ:
        slopeDirection *
        lerp(layer === "foreground" ? 0.04 : 0.015, layer === "foreground" ? 0.22 : 0.16, random()) *
        lerp(1.0, 0.48, lane),
      color: baseColor,
    })
  }

  return instances
}

function createTerrainMesh() {
  const terrainWidth = FOOTER_SCENE_CONFIG.meadow.width + 18
  const terrainDepth = FOOTER_SCENE_CONFIG.meadow.depth + 22
  const terrainOffsetZ = FOOTER_SCENE_CONFIG.meadow.depth * 0.18
  const baseY = FOOTER_SCENE_CONFIG.meadow.floorY - 0.36
  const geometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, 56, 28)
  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const nearColor = new THREE.Color("#215b3f")
  const farColor = new THREE.Color("#3d4a33")
  const ridgeDryColor = new THREE.Color("#5b6641")
  const valleyWetColor = new THREE.Color("#1a3f30")
  const mossColor = new THREE.Color("#4f6e3a")
  const color = new THREE.Color()

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const sampleZ = -positions.getY(index) + terrainOffsetZ
    const terrain = sampleTerrain(x, sampleZ)
    const depthMix = clamp((sampleZ + 4) / (terrainDepth + 4), 0, 1)
    const mossNoise = fbm2D(x * 0.08 + 13.2, sampleZ * 0.08 - 9.4)
    const moistureNoise = fbm2D(x * 0.12 - 4.7, sampleZ * 0.13 + 7.1)
    const dryNoise = fbm2D(x * 0.22 + 1.6, sampleZ * 0.2 - 2.9)

    positions.setZ(index, terrain.height - baseY)
    color.copy(nearColor).lerp(farColor, clamp(depthMix * 0.85, 0, 1))
    color.lerp(valleyWetColor, terrain.centerChannel * (0.25 + terrain.lane * 0.52))
    color.lerp(ridgeDryColor, terrain.slopeRatio * (0.22 + depthMix * 0.18))
    color.lerp(mossColor, clamp(mossNoise * 0.42 - 0.12, 0, 0.3))
    color.offsetHSL(
      lerp(-0.012, 0.014, moistureNoise),
      lerp(-0.04, 0.05, mossNoise),
      lerp(-0.08, 0.06, dryNoise) + terrain.slopeRatio * 0.015 - terrain.centerChannel * 0.022,
    )
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  positions.needsUpdate = true
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    opacity: 0.78,
  })
  const mesh: TerrainMesh = new THREE.Mesh(geometry, material)

  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, baseY, terrainOffsetZ)
  mesh.renderOrder = 0

  return mesh
}

function createFireflySystem(count: number) {
  const random = createRandom(9137)
  const data: FireflyData[] = []
  const positions = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const alphas = new Float32Array(count)
  const geometry = new THREE.BufferGeometry()

  for (let index = 0; index < count; index += 1) {
    const lane = Math.pow(random(), 1.18)
    const side = random() < 0.5 ? -1 : 1
    const x = side * lerp(0.55, 5.4, Math.pow(random(), 1.5))
    const z = lerp(0.8, 6.2, lane)
    const groundY = getTerrainHeight(x, z)
    const baseY = groundY + lerp(0.86, 1.72, random())

    data.push({
      x,
      y: baseY,
      z,
      phase: random() * 100,
      drift: lerp(0.12, 0.22, random()),
      travelX: lerp(0.54, 1.6, random()),
      travelZ: lerp(0.42, 1.24, random()),
      altitudeMin: 0.44,
      altitudeMax: lerp(1.2, 2.1, random()),
      twinkle: lerp(0.22, 0.46, random()),
      baseScale: lerp(0.9, 1.42, random()),
      baseOpacity: lerp(0.78, 1, random()),
    })

    positions[index * 3] = x
    positions[index * 3 + 1] = baseY
    positions[index * 3 + 2] = z
    scales[index] = data[index].baseScale
    alphas[index] = data[index].baseOpacity
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1))
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(FOOTER_SCENE_CONFIG.colors.firefly) },
    },
    vertexShader: fireflyVertexShader,
    fragmentShader: fireflyFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)

  points.frustumCulled = false
  points.renderOrder = 3

  return {
    data,
    positions,
    scales,
    alphas,
    geometry,
    material,
    points,
  } satisfies FireflySystem
}

function updateFireflies(
  fireflies: FireflySystem | null,
  elapsed: number,
  progress: number,
) {
  if (!fireflies) {
    return
  }

  for (let index = 0; index < fireflies.data.length; index += 1) {
    const firefly = fireflies.data[index]
    const time = elapsed * firefly.drift + firefly.phase
    const noiseX = (fbm2D(time * 0.24, firefly.phase * 0.31) - 0.5) * firefly.travelX * 2.1
    const noiseZ = (fbm2D(firefly.phase * 0.47, time * 0.22) - 0.5) * firefly.travelZ * 2.1
    const orbitX = Math.sin(time * 1.26 + firefly.phase) * firefly.travelX * 0.3
    const orbitZ = Math.cos(time * 1.08 + firefly.phase * 0.78) * firefly.travelZ * 0.26
    const offsetX = noiseX + orbitX
    const offsetZ = noiseZ + orbitZ
    const x = firefly.x + offsetX
    const z = firefly.z + offsetZ
    const groundY = getTerrainHeight(x, z)
    const verticalNoise = (fbm2D(time * 0.16 + 8.6, firefly.phase * 0.22) - 0.5) * 2
    const hover = Math.sin(time * 1.48 + firefly.phase * 0.6) * 0.16
    const y = clamp(
      firefly.y + verticalNoise * firefly.altitudeMax * 0.46 + hover,
      groundY + firefly.altitudeMin,
      groundY + firefly.altitudeMax,
    )
    const glow =
      0.82 +
      (fbm2D(time * 0.28, firefly.phase * 0.83) - 0.5) * firefly.twinkle * 2 +
      Math.sin(time * 2.2 + firefly.phase) * 0.06

    fireflies.positions[index * 3] = x
    fireflies.positions[index * 3 + 1] = y
    fireflies.positions[index * 3 + 2] = z
    fireflies.scales[index] = firefly.baseScale * (1 + glow * 0.18)
    fireflies.alphas[index] =
      firefly.baseOpacity * (0.82 + glow * 0.28) * (0.74 + progress * 0.12)
  }

  fireflies.geometry.attributes.position.needsUpdate = true
  fireflies.geometry.attributes.aScale.needsUpdate = true
  fireflies.geometry.attributes.aAlpha.needsUpdate = true
}

export default function FooterSceneCanvas({
  reducedMotion,
}: FooterSceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") {
      return reducedMotion
    }

    return reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })
  const [webglAvailable, setWebglAvailable] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }

    return supportsWebGL()
  })

  const shouldRenderScene = webglAvailable && !prefersReducedMotion

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handleChange = () => {
      setPrefersReducedMotion(reducedMotion || mediaQuery.matches)
    }

    handleChange()
    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [reducedMotion])

  useEffect(() => {
    if (!shouldRenderScene || !containerRef.current) {
      return
    }

    const container = containerRef.current
    container.replaceChildren()

    const section = container.parentElement
    if (!section) {
      return
    }

    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches
    const profile = getFooterSceneProfile(window.innerWidth, window.innerHeight, hasCoarsePointer)
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      FOOTER_SCENE_CONFIG.camera.fov,
      1,
      FOOTER_SCENE_CONFIG.camera.near,
      FOOTER_SCENE_CONFIG.camera.far,
    )
    const meadowUniforms = createGrassUniforms({
      base: FOOTER_SCENE_CONFIG.colors.base,
      tip: FOOTER_SCENE_CONFIG.colors.tip,
      fogStart: FOOTER_SCENE_CONFIG.colors.fogStart,
    })
    const foregroundUniforms = createGrassUniforms({
      base: "#196e50",
      tip: "#48ffab",
      fogStart: FOOTER_SCENE_CONFIG.colors.fogStart,
    })
    const fogStartColor = new THREE.Color(FOOTER_SCENE_CONFIG.colors.fogStart)
    const fogEndColor = new THREE.Color(FOOTER_SCENE_CONFIG.colors.fogEnd)
    const meadowGeometry = new THREE.PlaneGeometry(
      1,
      1,
      FOOTER_SCENE_CONFIG.grass.widthSegments,
      FOOTER_SCENE_CONFIG.grass.heightSegments,
    )
    const foregroundGeometry = meadowGeometry.clone()
    const shapeBladeGeometry = (
      geometry: THREE.PlaneGeometry,
      widthBoost: number,
      curveBoost: number,
    ) => {
      const bladePositions = geometry.attributes.position as THREE.BufferAttribute
      const bladeUvs = geometry.attributes.uv as THREE.BufferAttribute

      for (let index = 0; index < bladePositions.count; index += 1) {
        const y = bladeUvs.getY(index)
        const side = bladePositions.getX(index) < 0 ? -1 : 1
        const taper = lerp(0.36 * widthBoost, 0.005 * widthBoost, Math.pow(y, 1.15))

        bladePositions.setX(index, side * taper)
        bladePositions.setZ(index, Math.pow(y, 2.5) * 0.22 * curveBoost)
      }

      bladePositions.needsUpdate = true
      geometry.translate(0, 0.5, 0)
    }

    shapeBladeGeometry(meadowGeometry, 1, 1)
    shapeBladeGeometry(foregroundGeometry, 1.15, 1.2)

    const meadowMaterial = new THREE.ShaderMaterial({
      uniforms: meadowUniforms,
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      side: THREE.DoubleSide,
      depthWrite: true,
      transparent: false,
      alphaTest: 0.14,
    })
    const foregroundMaterial = new THREE.ShaderMaterial({
      uniforms: foregroundUniforms,
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      side: THREE.DoubleSide,
      depthWrite: true,
      transparent: false,
      alphaTest: 0.12,
    })
    const foregroundCount = Math.max(Math.floor(profile.grassCount * 0.34), 1)
    const meadowCount = profile.grassCount - foregroundCount
    const meadowMesh = new THREE.InstancedMesh(
      meadowGeometry,
      meadowMaterial,
      meadowCount,
    )
    const foregroundMesh = new THREE.InstancedMesh(
      foregroundGeometry,
      foregroundMaterial,
      foregroundCount,
    )
    const terrainMesh = createTerrainMesh()
    const fireflies = createFireflySystem(profile.fireflyCount)
    const dummy = new THREE.Object3D()
    const meadowInstances = createGrassInstances(meadowCount, "meadow")
    const foregroundInstances = createGrassInstances(foregroundCount, "foreground")

    camera.position.set(
      FOOTER_SCENE_CONFIG.camera.basePosition.x,
      FOOTER_SCENE_CONFIG.camera.basePosition.y,
      FOOTER_SCENE_CONFIG.camera.basePosition.z,
    )
    camera.lookAt(
      FOOTER_SCENE_CONFIG.camera.lookAt.x,
      FOOTER_SCENE_CONFIG.camera.lookAt.y,
      FOOTER_SCENE_CONFIG.camera.lookAt.z,
    )

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, FOOTER_SCENE_CONFIG.render.maxDpr))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.className = "footer-scene__canvas"

    container.replaceChildren(renderer.domElement)

    const applyGrassLayer = (
      mesh: GrassMesh,
      instances: GrassInstanceData[],
      renderOrder: number,
    ) => {
      const instanceSeed = new Float32Array(instances.length)
      const instanceLean = new Float32Array(instances.length)
      const instanceColor = new Float32Array(instances.length * 3)

      for (let index = 0; index < instances.length; index += 1) {
        const blade = instances[index]
        dummy.position.set(blade.x, blade.y, blade.z)
        dummy.rotation.set(blade.tiltX, blade.rotationY, blade.tiltZ)
        dummy.scale.set(blade.width, blade.height, 1)
        dummy.updateMatrix()

        mesh.setMatrixAt(index, dummy.matrix)
        instanceSeed[index] = blade.seed
        instanceLean[index] = blade.lean
        instanceColor[index * 3] = blade.color.r
        instanceColor[index * 3 + 1] = blade.color.g
        instanceColor[index * 3 + 2] = blade.color.b
      }

      mesh.geometry.setAttribute(
        "instanceSeed",
        new THREE.InstancedBufferAttribute(instanceSeed, 1),
      )
      mesh.geometry.setAttribute(
        "instanceLean",
        new THREE.InstancedBufferAttribute(instanceLean, 1),
      )
      mesh.geometry.setAttribute(
        "instanceColor",
        new THREE.InstancedBufferAttribute(instanceColor, 3),
      )
      mesh.instanceMatrix.needsUpdate = true
      mesh.frustumCulled = false
      mesh.renderOrder = renderOrder
    }

    applyGrassLayer(meadowMesh, meadowInstances, 2)
    applyGrassLayer(foregroundMesh, foregroundInstances, 3)
    scene.add(terrainMesh)
    scene.add(fireflies.points)
    scene.add(meadowMesh)
    scene.add(foregroundMesh)

    const state = {
      isPageVisible: document.visibilityState === "visible",
      isSectionVisible: false,
      progress: 0,
      running: false,
      targetProgress: 0,
    }
    const startTime = performance.now()

    const resize = () => {
      const rect = section.getBoundingClientRect()
      const width = Math.max(rect.width, 1)
      const height = Math.max(rect.height, 1)

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    resize()

    let scrollTrigger: ScrollTrigger | null = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        state.targetProgress = self.progress
      },
    })

    const renderFrame = () => {
      if (!state.running) {
        return
      }

      rafRef.current = window.requestAnimationFrame(renderFrame)

      if (!state.isPageVisible || !state.isSectionVisible) {
        return
      }

      const elapsed = (performance.now() - startTime) / 1000
      state.progress = lerp(state.progress, state.targetProgress, 0.06)

      meadowUniforms.uTime.value = elapsed
      meadowUniforms.uScrollProgress.value = state.progress
      meadowUniforms.uWindStrength.value = lerp(
        FOOTER_SCENE_CONFIG.wind.baseStrength,
        FOOTER_SCENE_CONFIG.wind.maxStrength,
        0.38 + state.progress * 0.42,
      )
      meadowUniforms.uNoiseScale.value = FOOTER_SCENE_CONFIG.wind.noiseScale
      meadowUniforms.uDriftSpeed.value = FOOTER_SCENE_CONFIG.wind.driftSpeed
      meadowUniforms.uWindFrequency.value = FOOTER_SCENE_CONFIG.wind.frequency
      meadowUniforms.uFogColor.value
        .copy(fogStartColor)
        .lerp(fogEndColor, clamp(state.progress * 0.55, 0, 1))
      foregroundUniforms.uTime.value = elapsed
      foregroundUniforms.uScrollProgress.value = state.progress
      foregroundUniforms.uWindStrength.value = meadowUniforms.uWindStrength.value * 1.18
      foregroundUniforms.uNoiseScale.value = FOOTER_SCENE_CONFIG.wind.noiseScale * 0.92
      foregroundUniforms.uDriftSpeed.value = FOOTER_SCENE_CONFIG.wind.driftSpeed * 1.08
      foregroundUniforms.uWindFrequency.value = FOOTER_SCENE_CONFIG.wind.frequency * 1.06
      foregroundUniforms.uFogColor.value
        .copy(fogStartColor)
        .lerp(fogEndColor, clamp(state.progress * 0.46, 0, 1))

      updateFireflies(fireflies, elapsed, state.progress)
      renderer.render(scene, camera)
    }

    const startLoop = () => {
      if (state.running) {
        return
      }

      state.running = true
      renderFrame()
    }

    const stopLoop = () => {
      state.running = false

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        state.isSectionVisible = entry.isIntersecting

        if (state.isPageVisible && state.isSectionVisible) {
          startLoop()
        } else {
          stopLoop()
        }
      },
      { threshold: 0.05 },
    )

    const resizeObserver = new ResizeObserver(() => {
      resize()
      scrollTrigger?.refresh()
    })

    const handleVisibility = () => {
      state.isPageVisible = document.visibilityState === "visible"

      if (state.isPageVisible && state.isSectionVisible) {
        startLoop()
      } else {
        stopLoop()
      }
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      setWebglAvailable(false)
    }

    renderer.domElement.addEventListener("webglcontextlost", handleContextLost, false)
    document.addEventListener("visibilitychange", handleVisibility)
    intersectionObserver.observe(section)
    resizeObserver.observe(section)
    handleVisibility()

    return () => {
      stopLoop()
      scrollTrigger?.kill()
      scrollTrigger = null
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener("visibilitychange", handleVisibility)
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost)

      scene.remove(fireflies.points)
      fireflies.geometry.dispose()
      fireflies.material.dispose()
      terrainMesh.geometry.dispose()
      terrainMesh.material.dispose()
      meadowGeometry.dispose()
      foregroundGeometry.dispose()
      meadowMaterial.dispose()
      foregroundMaterial.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      container.replaceChildren()
    }
  }, [shouldRenderScene])

  if (!shouldRenderScene) {
    return null
  }

  return <div ref={containerRef} className="footer-scene" aria-hidden="true" />
}
