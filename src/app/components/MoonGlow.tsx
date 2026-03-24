'use client'

import { useEffect, useRef, useState } from "react"
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
  // Cache la référence au footer pour éviter un querySelector à chaque scroll
  const footerTopRef = useRef<number | null>(null)

  useEffect(() => {
    let rafId = 0

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
      const travelEnd = Math.max(footerTop - window.innerHeight * 0.6, 1)
      const progress = clamp(window.scrollY / travelEnd, 0, 1)

      if (theme === 'day') {
        // Soleil : démarre en haut-droite (position CSS), descend au scroll
        // shiftX = 0 : pas de déplacement horizontal → pas d'overflow-x
        const shiftY  = lerp(0, 54, progress)
        const scale   = lerp(1, 0.78, progress)
        const opacity = lerp(0.96, 0.55, progress)
        setStyle({ opacity, transform: `translate3d(0, ${shiftY}vh, 0) scale(${scale})` })
      } else {
        // Lune : démarre légèrement en bas (40 vh au lieu de 62), monte au scroll
        const shiftX  = lerp(-4, 0, progress)
        const shiftY  = lerp(40, 0, progress)
        const scale   = lerp(0.88, 1, progress)
        const opacity = lerp(0.62, 0.96, progress)
        setStyle({ opacity, transform: `translate3d(${shiftX}vw, ${shiftY}vh, 0) scale(${scale})` })
      }
    }

    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(update)
    }

    const handleResize = () => {
      // Invalide le cache footer si la fenêtre est redimensionnée
      footerTopRef.current = null
      handleScroll()
    }

    update()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleResize, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleResize)
    }
  }, [theme])

  return <div className={theme === 'day' ? 'sun-glow' : 'moon-glow'} style={style} />
}
