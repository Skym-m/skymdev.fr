import HeroClouds from "./HeroClouds"

export default function WelcomeSection() {
  return (
    <section id="welcome" className="hero">
        <HeroClouds />
        <div className="welcome">
          <p className="section-eyebrow">SkymDev</p>
          <h1>
            Sites, projets,
            <br />
            et univers numériques
          </h1>
          <p className="hero-copy">
            Portfolio de SkymDev, développeur indépendant passionné par le web,
            le design et l&apos;audiovisuel.
          </p>
        </div>
    </section>
  )
}
