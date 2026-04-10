'use client'

import React, { useMemo } from "react"

type Cloud = {
  top: string
  left: string
  width: string
  height: string
  opacity: string
  duration: string
  delay: string
  blur: string
}

function seededUnit(seed: number) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1
}

function formatUnit(value: number, unit = "") {
  return `${value.toFixed(6)}${unit}`
}

function generateClouds(count: number): Cloud[] {
  return Array.from({ length: count }).map((_, index) => {
    const seed = count * 131 + index * 19
    const w = seededUnit(seed + 1) * 220 + 80

    return {
      top: formatUnit(seededUnit(seed + 2) * 85, "%"),
      left: formatUnit(seededUnit(seed + 3) * 94, "%"),
      width: formatUnit(w, "px"),
      height: formatUnit(w * (seededUnit(seed + 4) * 0.12 + 0.18), "px"),
      opacity: formatUnit(seededUnit(seed + 5) * 0.1 + 0.08),
      duration: formatUnit(seededUnit(seed + 6) * 16 + 20, "s"),
      delay: `-${formatUnit(seededUnit(seed + 7) * 22, "s")}`,
      blur: formatUnit(seededUnit(seed + 8) * 12 + 16, "px"),
    }
  })
}

export default function DayClouds({ count = 14 }: { count?: number }) {
  const clouds = useMemo(() => generateClouds(count), [count])

  return (
    <div className="day-clouds-layer" aria-hidden="true">
      {clouds.map((cloud, i) => (
        <div
          key={i}
          className="day-cloud"
          style={{
            top:    cloud.top,
            left:   cloud.left,
            width:  cloud.width,
            height: cloud.height,
            opacity: cloud.opacity,
            ['--cloud-blur' as string]: cloud.blur,
            animationDuration: cloud.duration,
            animationDelay:    cloud.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
