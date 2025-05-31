'use client'

import StarsBackground from './Stars'
import MoonGlow from './MoonGlow'

export default function WelcomeSection() {
  return (
    <section id="welcome" style={{ position: 'relative', overflow: 'hidden' }}>
        <MoonGlow />
          <StarsBackground />
            <div className="shooting-star" />
            <div className="welcome" style={{ position: 'relative', zIndex: 1 }}>
            <h1>
              SkymDev's<br />
              <span className="portfolio">Portfolio</span>
            </h1>
          </div>
    </section>
  )
}
