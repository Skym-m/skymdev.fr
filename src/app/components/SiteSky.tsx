'use client'

import { useEffect, useRef, useState } from "react"

import MoonGlow from "./MoonGlow"
import StarsBackground from "./Stars"
import AirplaneTraffic from "./AirplaneTraffic"

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

type SkyStyle = {
  opacity: number
  transform: string
}

export default function SiteSky() {
  const [starsStyle, setStarsStyle] = useState<SkyStyle>({
    opacity: 0.86,
    transform: "translate3d(0, 0, 0) scale(1)",
  })

  const rafRef = useRef(0)
  // Cache la référence au footer pour éviter un offsetTop à chaque scroll
  const footerTopRef = useRef<number | null>(null)

  useEffect(() => {
    const getFooterTop = () => {
      if (footerTopRef.current === null) {
        const footer = document.querySelector(".site-footer")
        footerTopRef.current =
          footer instanceof HTMLElement
            ? footer.offsetTop
            : document.body.scrollHeight
      }
      return footerTopRef.current
    }

    const update = () => {
      const footerTop = getFooterTop()
      const travelEnd = Math.max(footerTop - window.innerHeight * 0.5, 1)
      const progress = clamp(window.scrollY / travelEnd, 0, 1)

      // Étoiles — dérivent vers le bas (parallaxe standard)
      const starsY = lerp(0, 18, progress)
      const starsX = lerp(0, -2, progress)
      setStarsStyle({
        opacity:   lerp(0.86, 0.98, progress),
        transform: `translate3d(${starsX}vw, ${starsY}vh, 0) scale(${lerp(1, 1.03, progress)})`,
      })

    }

    const handleScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = window.requestAnimationFrame(update)
    }

    const handleResize = () => {
      footerTopRef.current = null
      handleScroll()
    }

    update()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleResize, { passive: true })

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div className="site-sky" aria-hidden="true">
      <div className="site-sky__stars" style={starsStyle}>
        <StarsBackground count={90} />
      </div>

      <MoonGlow />
      <AirplaneTraffic />
    </div>
  )
}
