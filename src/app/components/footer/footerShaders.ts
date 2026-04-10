import * as THREE from "three"

export type GrassUniforms = {
  uBaseColor: THREE.IUniform<THREE.Color>
  uDriftSpeed: THREE.IUniform<number>
  uFogColor: THREE.IUniform<THREE.Color>
  uWindFrequency: THREE.IUniform<number>
  uNoiseScale: THREE.IUniform<number>
  uScrollProgress: THREE.IUniform<number>
  uTime: THREE.IUniform<number>
  uTipColor: THREE.IUniform<THREE.Color>
  uWindStrength: THREE.IUniform<number>
}

export function createGrassUniforms(colors: {
  base: string
  fogStart: string
  tip: string
}) {
  return {
    uTime: { value: 0 },
    uScrollProgress: { value: 0 },
    uWindStrength: { value: 0.12 },
    uNoiseScale: { value: 0.12 },
    uDriftSpeed: { value: 0.06 },
    uWindFrequency: { value: 0.18 },
    uBaseColor: { value: new THREE.Color(colors.base) },
    uTipColor: { value: new THREE.Color(colors.tip) },
    uFogColor: { value: new THREE.Color(colors.fogStart) },
  } satisfies GrassUniforms
}

export const grassVertexShader = `
attribute float instanceLean;
attribute float instanceSeed;
attribute vec3 instanceColor;

uniform float uNoiseScale;
uniform float uDriftSpeed;
uniform float uScrollProgress;
uniform float uTime;
uniform float uWindFrequency;
uniform float uWindStrength;

varying float vDepthMix;
varying vec3 vInstanceColor;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(7.2, 3.4);
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vUv = uv;
  vInstanceColor = instanceColor;

  vec3 transformed = position;
  float heightFactor = clamp(uv.y, 0.0, 1.0);
  float bendMask = pow(heightFactor, 1.28);
  float tipMask = pow(heightFactor, 1.82);
  vec3 worldBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = instanceSeed * 6.28318530718;
  float cycle = uTime * uWindFrequency * 6.28318530718;
  vec2 drift = vec2(cos(phase * 0.63), sin(phase * 0.37)) * uTime * uDriftSpeed;
  vec2 windSample = worldBase.xz * uNoiseScale + drift + vec2(cycle * 0.22, cycle * 0.16);
  vec2 broadSample = worldBase.xz * (uNoiseScale * 0.52) - drift * 0.7 + vec2(-cycle * 0.12, cycle * 0.18);

  float primaryField = fbm(windSample + vec2(instanceSeed * 2.3, -instanceSeed * 1.7)) * 2.0 - 1.0;
  float broadField = fbm(broadSample + vec2(-instanceSeed * 1.1, instanceSeed * 1.9)) * 2.0 - 1.0;
  float gust = primaryField * 0.7 + broadField * 0.3;
  float wind = gust * uWindStrength * (0.82 + instanceLean * 0.18);
  float lateralBias = (instanceLean - 1.0) * 0.04 * bendMask;
  float verticalLift = abs(wind) * (0.026 + uScrollProgress * 0.03) * tipMask;

  transformed.x += wind * (0.16 + bendMask * 1.22) + lateralBias;
  transformed.z += wind * 0.62 * bendMask + broadField * 0.045 * tipMask;
  transformed.y += verticalLift;

  vec4 worldPosition = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  vec4 mvPosition = viewMatrix * worldPosition;

  vDepthMix = clamp((-mvPosition.z - 2.0) / 20.0, 0.0, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

export const grassFragmentShader = `
uniform vec3 uBaseColor;
uniform vec3 uFogColor;
uniform float uScrollProgress;
uniform float uTime;
uniform vec3 uTipColor;

varying float vDepthMix;
varying vec3 vInstanceColor;
varying vec2 vUv;

void main() {
  float halfWidth = mix(0.46, 0.005, pow(vUv.y, 1.15));
  float edge = abs(vUv.x - 0.5);
  float alpha = 1.0 - smoothstep(halfWidth, halfWidth + 0.03, edge);

  if (alpha < 0.14) {
    discard;
  }

  float heightMix = pow(vUv.y, 1.08);
  vec3 color = mix(uBaseColor, uTipColor, heightMix);
  color *= mix(0.94, 1.28, vInstanceColor.r);
  color += vInstanceColor * 0.08;
  color += vec3(0.026, 0.07, 0.028) * (1.0 - vUv.y);
  color += 0.02 * sin(uTime * 0.75 + vInstanceColor.g * 15.0 + vUv.y * 8.0);
  color = mix(color, uFogColor, vDepthMix * (0.22 + uScrollProgress * 0.1));

  gl_FragColor = vec4(color, alpha);
}
`
