'use client'

import React, { useEffect, useState } from "react"

type Airplane = {
    id: number
    top: number
    direction: 'ltr' | 'rtl'
    speed: number
}

export default function AirplaneTraffic() {
    const [airplane, setAirplane] = useState<Airplane | null>(null)

    useEffect(() => {
        const trigger = () => {
            const speed = Math.random() * 12 + 18
            setAirplane({
                id: Date.now(),
                top: Math.random() * 30 + 8,
                direction: Math.random() < 0.5 ? 'ltr' : 'rtl',
                speed,
            })
            setTimeout(() => setAirplane(null), (speed + 2) * 1000)
        }
        const initial = setTimeout(trigger, 8000)
        const interval = setInterval(trigger, 38000)
        return () => { clearTimeout(initial); clearInterval(interval) }
    }, [])

    if (!airplane) return null

    return (
        <div className="airplane-layer">
            <div
                key={airplane.id}
                className={`airplane airplane-${airplane.direction}`}
                style={{
                    top: `${airplane.top}%`,
                    ['--fly-duration' as string]: `${airplane.speed}s`,
                } as React.CSSProperties}
            >
                <div className="airplane-light airplane-red" />
                <div className="airplane-body" />
                <div className="airplane-light airplane-green" />
            </div>
        </div>
    )
}
