'use client'

import React, { useEffect, useState } from "react"
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

export default function StarsBackground({ count = 60 }) {
    const theme = useTheme()
    const [stars, setStars] = useState<Star[]>([])
    const [shootingStar, setShootingStar] = useState<ShootingStar | null>(null)

    useEffect(() => {
        const generatedStars = Array.from({ length: count }).map(() => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: `${Math.random() * 2 + 1}px`,
            duration: `${Math.random() * 1.4 + 2.2}s`,
            delay: `${Math.random() * 3}s`,
        }))
        setStars(generatedStars)
    }, [count])

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
                        top: `${shootingStar.top}%`,
                        ['--shoot-angle' as string]: `${shootingStar.angle}deg`,
                    } as React.CSSProperties}
                />
            )}
        </div>
    )
}
