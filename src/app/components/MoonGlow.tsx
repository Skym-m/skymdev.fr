'use client'

import { useEffect, useState } from "react"
import { useTheme } from "./ThemeProvider"

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

export default function MoonGlow() {
  const theme = useTheme()
  const [style, setStyle] = useState({
    opacity: 0.96,
    transform: "translate3d(0, 0, 0) scale(1)",
  })

  useEffect(() => {
    let rafId = 0

    const update = () => {
      const footer = document.querySelector(".site-footer")
      const footerTop = footer instanceof HTMLElement ? footer.offsetTop : document.body.scrollHeight
      const travelEnd = Math.max(footerTop - window.innerHeight * 0.6, 1)
      const progress = clamp(window.scrollY / travelEnd, 0, 1)

      if (theme === 'day') {
        // Soleil : démarre en haut-droite (position CSS), descend au scroll
        const shiftX = lerp(0, 3, progress)
        const shiftY = lerp(0, 54, progress)
        const scale  = lerp(1, 0.78, progress)
        const opacity = lerp(0.96, 0.55, progress)
        setStyle({ opacity, transform: `translate3d(${shiftX}vw, ${shiftY}vh, 0) scale(${scale})` })
      } else {
        // Lune : démarre en bas-gauche (62vh / -4vw), monte au scroll
        const shiftX = lerp(-4, 0, progress)
        const shiftY = lerp(62, 0, progress)
        const scale  = lerp(0.82, 1, progress)
        const opacity = lerp(0.58, 0.96, progress)
        setStyle({ opacity, transform: `translate3d(${shiftX}vw, ${shiftY}vh, 0) scale(${scale})` })
      }
    }

    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [theme])

  return <div className={theme === 'day' ? 'sun-glow' : 'moon-glow'} style={style} />
}
