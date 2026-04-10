'use client'

import React, { useEffect, useMemo, useState } from "react"
import { useTheme } from "./ThemeProvider"

type Star = {
    top: string
    left: string
    size: string
    duration: string
    delay: string
}

type ShootingStar = {
    id: number
    top: number
    angle: number
    isColorful: boolean
}

function seededUnit(seed: number) {
    return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1
}

function formatUnit(value: number, unit: string) {
    return `${value.toFixed(6)}${unit}`
}

function generateStars(count: number): Star[] {
    return Array.from({ length: count }).map((_, index) => {
        const seed = count * 97 + index * 17

        return {
            top: formatUnit(seededUnit(seed + 1) * 100, "%"),
            left: formatUnit(seededUnit(seed + 2) * 100, "%"),
            size: formatUnit(seededUnit(seed + 3) * 2 + 1, "px"),
            duration: formatUnit(seededUnit(seed + 4) * 1.4 + 2.2, "s"),
            delay: formatUnit(seededUnit(seed + 5) * 3, "s"),
        }
    })
}

export default function StarsBackground({ count = 60 }) {
    const theme = useTheme()
    const stars = useMemo(() => generateStars(count), [count])
    const [shootingStar, setShootingStar] = useState<ShootingStar | null>(null)

    useEffect(() => {
        const interval = setInterval(() => {
            setShootingStar({
                id: Date.now(),
                top: Math.random() * 40 + 5,
                angle: Math.random() * 25 + 15,
                isColorful: Math.random() < 0.3,
            })
            setTimeout(() => setShootingStar(null), 2200)
        }, 8000)
        return () => clearInterval(interval)
    }, [])

    if (theme === 'day') return null

    return (
        <div className="stars-background">
            {stars.map((star, i) => (
                <div
                    key={i}
                    className="star"
                    style={{
                        top: star.top,
                        left: star.left,
                        width: star.size,
                        height: star.size,
                        animationDuration: star.duration,
                        animationDelay: star.delay,
                    }}
                />
            ))}

            {shootingStar && (
                <div
                    key={`shooting-${shootingStar.id}`}
                    className={`shooting-star ${shootingStar.isColorful ? 'multicolor' : ''}`}
                    style={{
                        top: formatUnit(shootingStar.top, "%"),
                        ['--shoot-angle' as string]: formatUnit(shootingStar.angle, "deg"),
                    } as React.CSSProperties}
                />
            )}
        </div>
    )
}
