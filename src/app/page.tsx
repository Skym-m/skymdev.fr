import Image from "next/image"

import ProjectList from "@/app/components/ProjectList"
import WelcomeSection from "@/app/components/WelcomeSection"
import {
  aboutParagraphs,
  freelanceParagraphs,
} from "@/app/data/siteContent"
import { getProjects } from "@/app/lib/projects"

export default async function Home() {
  const projects = await getProjects()

  return (
    <main>
      <WelcomeSection />

      <section id="about" className="content-section">
        <div className="section-shell about-layout">
          <Image
            className="profile-image"
            src="/skym.png"
            alt="Portrait de SkymDev"
            width={2268}
            height={4030}
            sizes="(max-width: 900px) 100vw, 300px"
          />
          <div className="section-copy">
            <p className="section-eyebrow">Présentation</p>
            <h2>À propos de moi</h2>
            <div className="section-text">
              {aboutParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="saturn" className="content-section">
        <div className="section-shell">
          <div className="saturn-spotlight">
            <p className="saturn-spotlight__tag">Système interne</p>
            <h2 className="saturn-spotlight__title">Saturn</h2>
            <p className="saturn-spotlight__sub">
              Gestion de flux logistiques et de stock.
            </p>
            <p className="saturn-spotlight__desc">
              Un système complet pensé de A à Z — inventaire, mouvements, traçabilité. Construit à la main, sans outil tiers.
            </p>
            <a href="/saturn" className="saturn-spotlight__btn">
              En savoir plus →
            </a>
            <div className="saturn-spotlight__visual" aria-hidden="true">⬡</div>
          </div>
        </div>
      </section>

      <ProjectList projects={projects} />

      <section id="dev" className="content-section">
        <div className="section-shell">
          <div className="section-copy">
            <p className="section-eyebrow">Services</p>
            <h2>Freelance</h2>
            <div className="section-text">
              {freelanceParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
