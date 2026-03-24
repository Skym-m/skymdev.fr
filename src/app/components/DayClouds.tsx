'use client'

import React, { useEffect, useState } from "react"

type Cloud = {
  top: string
  left: string
  width: string
  height: string
  opacity: number
  duration: string
  delay: string
  blur: string
}

export default function DayClouds({ count = 14 }: { count?: number }) {
  const [clouds, setClouds] = useState<Cloud[]>([])

  useEffect(() => {
    const generated = Array.from({ length: count }).map(() => {
      const w = Math.random() * 220 + 80
      return {
        top:      `${Math.random() * 85}%`,
        left:     `${Math.random() * 94}%`,
        width:    `${w}px`,
        height:   `${w * (Math.random() * 0.12 + 0.18)}px`,
        opacity:  Math.random() * 0.1 + 0.08,    // 0.08 – 0.18 (très discret)
        duration: `${Math.random() * 16 + 20}s`,
        delay:    `-${Math.random() * 22}s`,
        blur:     `${Math.random() * 12 + 16}px`, // 16 – 28px
      }
    })
    setClouds(generated)
  }, [count])

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
