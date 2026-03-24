"use client"

import Link from "next/link"
import { useEffect } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/dist/ScrollTrigger"
import { useTheme } from "../components/ThemeProvider"

export default function SaturnPage() {
  const theme = useTheme()

  // Retourne le chemin de l'image selon le thème actif.
  // Jour : /saturn/name-day.png  |  Nuit : /saturn/name.png
  const screen = (name: string) =>
    theme === 'day' ? `/saturn/${name}-day.png` : `/saturn/${name}.png`

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    // Neutralise le CSS saturn-reveal pour laisser GSAP tout gérer
    const isMobile = window.innerWidth <= 768

    document.querySelectorAll<HTMLElement>(".saturn-reveal").forEach((el) => {
      el.style.opacity = "1"
      el.style.transform = "none"
      el.style.transition = "none"
    })

    // ─── 1. Hero entrance timeline ──────────────────────────────────
    const heroTl = gsap.timeline({ delay: 0.1 })
    heroTl
      .fromTo(".saturn-hero__eyebrow",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.65, ease: "power2.out" }
      )
      .fromTo(".saturn-hero__title",
        { opacity: 0, y: isMobile ? 36 : 64, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "power4.out" }, "-=0.35"
      )
      .fromTo(".saturn-hero__sub",
        { opacity: 0, y: isMobile ? 18 : 30 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, "-=0.7"
      )
      .fromTo(".saturn-hero__tagline",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.75, ease: "power3.out" }, "-=0.55"
      )
      .fromTo(".saturn-hero__mockup",
        { opacity: 0, y: isMobile ? 30 : 60, scale: 0.93 },
        { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "power3.out" }, "-=0.8"
      )

    // ─── 2. Hero parallax au scroll ────────────────────────────────
    gsap.to(".saturn-hero__content", {
      y: isMobile ? -20 : -50,
      ease: "none",
      scrollTrigger: {
        trigger: ".saturn-hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    })

    // ─── 3. Statements — word-by-word scrubbed ─────────────────────
    document.querySelectorAll(".saturn-statement__line, .saturn-statement__quote").forEach((el) => {
      if (el.querySelector(".sw")) return

      // Si l'élément contient des sous-éléments (spans accentués etc.),
      // on découpe uniquement les nœuds texte pour préserver le style
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const textNodes: Text[] = []
      let node: Node | null
      while ((node = walker.nextNode())) {
        if ((node.textContent ?? "").trim()) textNodes.push(node as Text)
      }

      textNodes.forEach((textNode) => {
        const parts = (textNode.textContent ?? "").split(/(\s+)/)
        const frag = document.createDocumentFragment()
        parts.forEach((part) => {
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part))
          } else if (part) {
            const span = document.createElement("span")
            span.className = "sw"
            span.textContent = part
            frag.appendChild(span)
          }
        })
        textNode.parentNode?.replaceChild(frag, textNode)
      })

      gsap.fromTo(
        el.querySelectorAll(".sw"),
        { opacity: 0.08 },
        {
          opacity: 1,
          stagger: 0.06,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest(".saturn-statement"),
            start: "top 80%",
            end: "bottom 35%",
            scrub: 0.7,
          },
        }
      )
    })

    // ─── 4. Feature sections ────────────────────────────────────────
    document.querySelectorAll<HTMLElement>(".saturn-feature").forEach((section, i) => {
      const visual = section.querySelector(".saturn-feature__visual")
      const copy = section.querySelector(".saturn-feature__copy")
      const items = section.querySelectorAll(".saturn-feature__list li")
      const isReverse = section.classList.contains("saturn-feature--reverse")

      if (visual) {
        gsap.fromTo(visual,
          {
            opacity: 0,
            scale: isMobile ? 0.94 : 0.89,
            y: isMobile ? 28 : 52,
            x: isMobile ? 0 : (isReverse ? -40 : 40),
          },
          {
            opacity: 1, scale: 1, y: 0, x: 0,
            duration: 1.1, ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 76%", once: true },
          }
        )
      }

      if (copy) {
        gsap.fromTo(copy,
          {
            opacity: 0,
            y: isMobile ? 20 : 36,
            x: isMobile ? 0 : (isReverse ? 30 : -30),
          },
          {
            opacity: 1, y: 0, x: 0,
            duration: 1, ease: "power3.out",
            delay: 0.1,
            scrollTrigger: { trigger: section, start: "top 74%", once: true },
          }
        )
      }

      if (items.length) {
        gsap.fromTo(items,
          { opacity: 0, x: isMobile ? 0 : -18 },
          {
            opacity: 1, x: 0,
            stagger: 0.09,
            duration: 0.55, ease: "power2.out",
            delay: 0.3,
            scrollTrigger: { trigger: section, start: "top 70%", once: true },
          }
        )
      }
    })

    // ─── 5. Roles grid stagger ──────────────────────────────────────
    gsap.fromTo(".saturn-roles__eyebrow, .saturn-roles__title, .saturn-roles__sub",
      { opacity: 0, y: 28 },
      {
        opacity: 1, y: 0,
        stagger: 0.12,
        duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: ".saturn-roles", start: "top 78%", once: true },
      }
    )
    gsap.fromTo(".saturn-role",
      { opacity: 0, y: 30, scale: 0.97 },
      {
        opacity: 1, y: 0, scale: 1,
        stagger: 0.09,
        duration: 0.65, ease: "power3.out",
        scrollTrigger: { trigger: ".saturn-roles__grid", start: "top 80%", once: true },
      }
    )

    // ─── 6. Availability ────────────────────────────────────────────
    gsap.fromTo(".saturn-avail__eyebrow, .saturn-avail__title, .saturn-avail__sub",
      { opacity: 0, y: 28 },
      {
        opacity: 1, y: 0,
        stagger: 0.13,
        duration: 0.85, ease: "power3.out",
        scrollTrigger: { trigger: ".saturn-avail", start: "top 78%", once: true },
      }
    )
    gsap.fromTo(".saturn-avail__card",
      { opacity: 0, y: 34, scale: 0.96 },
      {
        opacity: 1, y: 0, scale: 1,
        stagger: 0.1,
        duration: 0.75, ease: "power3.out",
        scrollTrigger: { trigger: ".saturn-avail__grid", start: "top 80%", once: true },
      }
    )

    // ─── 7. Tech/Ownership ──────────────────────────────────────────
    gsap.fromTo(".saturn-tech__eyebrow, .saturn-tech__title, .saturn-tech__sub",
      { opacity: 0, y: 28 },
      {
        opacity: 1, y: 0,
        stagger: 0.13,
        duration: 0.85, ease: "power3.out",
        scrollTrigger: { trigger: ".saturn-tech", start: "top 78%", once: true },
      }
    )
    gsap.fromTo(".saturn-tech__pill",
      { opacity: 0, scale: 0.82, y: 10 },
      {
        opacity: 1, scale: 1, y: 0,
        stagger: 0.08,
        duration: 0.5, ease: "back.out(1.5)",
        scrollTrigger: { trigger: ".saturn-tech__stack", start: "top 82%", once: true },
      }
    )

    // ─── 8. Capabilities grid ───────────────────────────────────────
    gsap.fromTo(".saturn-caps__title",
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: ".saturn-caps", start: "top 78%", once: true },
      }
    )
    gsap.fromTo(".saturn-cap",
      { opacity: 0, y: 36, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        stagger: { amount: 0.55, from: "start" },
        duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: ".saturn-caps__grid", start: "top 78%", once: true },
      }
    )

    // ─── 9. Closing cinématique ─────────────────────────────────────
    gsap.fromTo(".saturn-closing__inner > *",
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        stagger: 0.14,
        duration: 1, ease: "power4.out",
        scrollTrigger: { trigger: ".saturn-closing", start: "top 82%", once: true },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <div className="saturn-page">
      {/* Nav */}
      <nav className="saturn-nav">
        <Link href="/" className="saturn-nav__back">
          ← skymdev.fr
        </Link>
        <span className="saturn-nav__brand">Saturn</span>
        <span />
      </nav>

      {/* Hero */}
      <section className="saturn-hero">
        <div className="saturn-hero__bg" />
        <div className="saturn-hero__content">
          <p className="saturn-hero__eyebrow">Système de gestion interne</p>
          <h1 className="saturn-hero__title">Saturn.</h1>
          <p className="saturn-hero__sub">
            Gestion de convois de véhicules,<br />
            de flux logistiques et de stock.
          </p>
          <p className="saturn-hero__tagline">
            Conçu pour des concessions automobiles. Chaque véhicule, tracé. Chaque livraison, confirmée.
          </p>
        </div>
        <div className="saturn-hero__mockup saturn-reveal">
          <div className="saturn-mockup-shell">
            <div className="saturn-mockup-bar">
              <span /><span /><span />
            </div>
            <div className="saturn-mockup-screen">
              <img
                key={screen("hero")}
                src={screen("hero")}
                alt="Saturn — écran d'accueil"
              />
              <div className="saturn-mockup-placeholder">
                <span>saturn.skymdev.fr</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statement 1 */}
      <section className="saturn-statement saturn-reveal">
        <div className="saturn-statement__inner">
          <p className="saturn-statement__line">Saturn, ça marche, <span className="saturn-statement__accent">et c'est tout.</span></p>
        </div>
      </section>

      {/* Feature 1 — Convois VO/VN */}
      <section className="saturn-feature saturn-reveal">
        <div className="saturn-feature__inner">
          <div className="saturn-feature__copy">
            <p className="saturn-feature__eyebrow">Convois véhicules</p>
            <h2 className="saturn-feature__title">
              VO, VN.<br />Convoyés. Point.
            </h2>
            <p className="saturn-feature__desc">
              Un vendeur crée une demande de convoi en quelques clics depuis sa concession. Le transporteur la reçoit, planifie, assigne. Chaque étape est enregistrée — de la commande à la livraison.
            </p>
            <ul className="saturn-feature__list">
              <li>Véhicules d'occasion et neufs gérés séparément</li>
              <li>Le vendeur suit l'avancement en temps réel</li>
              <li>Le transporteur voit tout ce qu'il doit prendre en charge</li>
              <li>Historique complet de chaque demande</li>
            </ul>
          </div>
          <div className="saturn-feature__visual">
            <div className="saturn-screen-frame">
              <img
                key={screen("login")}
                src={screen("login")}
                alt="Saturn — interface de connexion"
              />
              <div className="saturn-screen-placeholder"><span>Demandes de convoi</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Statement 2 */}
      <section className="saturn-statement saturn-statement--sm saturn-reveal">
        <div className="saturn-statement__inner">
          <p className="saturn-statement__quote">
            "Vendeur, transporteur, chauffeur.<br />Chacun voit ce qui le concerne. Rien de plus."
          </p>
        </div>
      </section>

      {/* Feature 2 — Logistique multi-sites */}
      <section className="saturn-feature saturn-feature--reverse saturn-reveal">
        <div className="saturn-feature__inner">
          <div className="saturn-feature__copy">
            <p className="saturn-feature__eyebrow">Flux logistiques</p>
            <h2 className="saturn-feature__title">
              Des concessions<br />aux dépôts.
            </h2>
            <p className="saturn-feature__desc">
              Plusieurs sites, plusieurs dépôts ? Saturn suit chaque véhicule d'un bout à l'autre du réseau. Qui l'a reçu, quand, depuis où — tout est visible, sans avoir à décrocher le téléphone.
            </p>
            <ul className="saturn-feature__list">
              <li>Tous vos sites référencés dans un seul système</li>
              <li>Réceptions, expéditions, transferts sur un seul écran</li>
              <li>Chaque mouvement enregistré et consultable à tout moment</li>
              <li>Vous savez où est chaque véhicule, en temps réel</li>
            </ul>
          </div>
          <div className="saturn-feature__visual">
            <div className="saturn-screen-frame">
              <img
                key={screen("flux")}
                src={screen("flux")}
                alt="Saturn — flux logistiques"
              />
              <div className="saturn-screen-placeholder"><span>Flux logistiques</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3 — Tournées chauffeurs */}
      <section className="saturn-feature saturn-reveal">
        <div className="saturn-feature__inner">
          <div className="saturn-feature__copy">
            <p className="saturn-feature__eyebrow">Tournées & chauffeurs</p>
            <h2 className="saturn-feature__title">
              Le bon chauffeur.<br />La bonne tournée.
            </h2>
            <p className="saturn-feature__desc">
              Préparez une tournée, assignez les véhicules à livrer. Saturn génère automatiquement la feuille de route du chauffeur. Rien à imprimer à la main, rien à dicter par téléphone.
            </p>
            <ul className="saturn-feature__list">
              <li>Tournées créées et organisées en quelques minutes</li>
              <li>Feuille de route PDF générée automatiquement</li>
              <li>Le chauffeur voit ses missions, et uniquement elles</li>
              <li>Une fois validée, la tournée est figée — pas de surprise</li>
            </ul>
          </div>
          <div className="saturn-feature__visual">
            <div className="saturn-screen-frame">
              <img
                key={screen("stock")}
                src={screen("stock")}
                alt="Saturn — tournées chauffeurs"
              />
              <div className="saturn-screen-placeholder"><span>Gestion des tournées</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4 — Localisation */}
      <section className="saturn-feature saturn-feature--reverse saturn-reveal">
        <div className="saturn-feature__inner">
          <div className="saturn-feature__copy">
            <p className="saturn-feature__eyebrow">Localisation</p>
            <h2 className="saturn-feature__title">
              Perdu un véhicule ?<br />Saturn le retrouve.
            </h2>
            <p className="saturn-feature__desc">
              Un véhicule n'est plus là où il devrait être ? Lancez une recherche en quelques secondes. Saturn interroge automatiquement tout le réseau de concessions — et centralise les réponses.
            </p>
            <ul className="saturn-feature__list">
              <li>Recherche lancée depuis n'importe quel site</li>
              <li>Tout le réseau est interrogé automatiquement</li>
              <li>Chaque concession peut confirmer ou infirmer</li>
              <li>Historique de toutes les recherches conservé</li>
            </ul>
          </div>
          <div className="saturn-feature__visual">
            <div className="saturn-screen-frame">
              <img
                key={screen("interface")}
                src={screen("interface")}
                alt="Saturn — localisation de véhicule"
              />
              <div className="saturn-screen-placeholder"><span>Localisation véhicule</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles section */}
      <section className="saturn-roles saturn-reveal">
        <div className="saturn-roles__inner">
          <p className="saturn-roles__eyebrow">Accès & rôles</p>
          <h2 className="saturn-roles__title">6 rôles.<br />6 vues. Zéro confusion.</h2>
          <p className="saturn-roles__sub">Chaque acteur accède à son tableau de bord dédié. Pas de menu générique — un espace pensé pour ce qu'il fait.</p>
          <div className="saturn-roles__grid">
            {[
              { role: "Vendeur", desc: "Crée une demande de convoi depuis sa concession et suit son avancement jusqu'à la livraison. Sans passer par personne." },
              { role: "Manager VO", desc: "Supervise les véhicules d'occasion de son garage. Voit ce qui entre, ce qui sort, ce qui est en attente." },
              { role: "Manager VN", desc: "Même chose, côté véhicules neufs. Chaque marque, chaque entrée en stock, sous contrôle." },
              { role: "Transporteur", desc: "Organise les tournées, assigne les chauffeurs, planifie les convois. Tout depuis un seul tableau de bord." },
              { role: "Chauffeur", desc: "Ouvre Saturn et voit sa journée : les véhicules à livrer, les adresses, la feuille de route. Rien d'autre." },
              { role: "Administrateur", desc: "Gère les utilisateurs, les garages, les droits d'accès et les paramètres. Vue complète sur l'activité du réseau." },
            ].map((r) => (
              <div className="saturn-role" key={r.role}>
                <div className="saturn-role__header">
                  <span className="saturn-role__name">{r.role}</span>
                </div>
                <p className="saturn-role__desc">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statement 3 */}
      <section className="saturn-statement saturn-statement--sm saturn-reveal">
        <div className="saturn-statement__inner">
          <p className="saturn-statement__quote">
            "Pas de superflu. Juste ce qu'il faut,<br />là où il faut."
          </p>
        </div>
      </section>

      {/* Availability section */}
      <section className="saturn-avail saturn-reveal">
        <div className="saturn-avail__inner">
          <p className="saturn-avail__eyebrow">Disponibilité</p>
          <h2 className="saturn-avail__title">Partout.<br />Tout le temps.</h2>
          <p className="saturn-avail__sub">
            Téléphone sur le parking, tablette à la réception, ordinateur au bureau — même interface, mêmes données, en temps réel. Saturn fonctionne sur n'importe quel appareil, n'importe quel navigateur.
          </p>
          <div className="saturn-avail__grid">
            <div className="saturn-avail__card">
              <span className="saturn-avail__icon">📱</span>
              <h3 className="saturn-avail__card-title">Mobile, tablette, desktop</h3>
              <p className="saturn-avail__card-desc">L'interface s'adapte à l'écran. Un chauffeur sur le terrain et un responsable à son bureau voient la même information, en simultané.</p>
            </div>
            <div className="saturn-avail__card">
              <span className="saturn-avail__icon">🌐</span>
              <h3 className="saturn-avail__card-title">Tout navigateur, sans installation</h3>
              <p className="saturn-avail__card-desc">Chrome, Safari, Firefox, Edge. Aucune application à télécharger, aucun logiciel à installer. Un lien, et c'est accessible.</p>
            </div>
            <div className="saturn-avail__card saturn-avail__card--highlight">
              <span className="saturn-avail__icon">🤖</span>
              <h3 className="saturn-avail__card-title">Surveillé par intelligence artificielle</h3>
              <p className="saturn-avail__card-desc">Saturn est monitoré en permanence. Les anomalies sont détectées et corrigées en temps réel, avant même qu'elles n'impactent vos équipes. Pas d'attente, pas de ticket de support.</p>
            </div>
            <div className="saturn-avail__card">
              <span className="saturn-avail__icon">🔧</span>
              <h3 className="saturn-avail__card-title">Maintenu en continu</h3>
              <p className="saturn-avail__card-desc">Mises à jour, correctifs, nouvelles fonctionnalités. Saturn évolue sans interruption de service. Vos équipes ne voient jamais la différence — sauf que ça s'améliore.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ownership block */}
      <section className="saturn-tech saturn-reveal">
        <div className="saturn-tech__inner">
          <p className="saturn-tech__eyebrow">Indépendance</p>
          <h2 className="saturn-tech__title">Conçu sans dépendance.</h2>
          <p className="saturn-tech__sub">
            Saturn n'est pas un logiciel générique mal adapté. C'est un système développé sur mesure, pour ce métier précis. L'abonnement aussi est sur mesure — calculé en fonction de vos sites, de vos équipes et de votre usage réel. Pas de formule fixe, pas de fonctionnalité inutile payée chaque mois.
          </p>
          <div className="saturn-tech__stack">
            {[
              { name: "Sur mesure", note: "Zéro compromis fonctionnel" },
              { name: "Tarif sur mesure", note: "Adapté à vos sites et vos équipes" },
              { name: "Données maîtrisées", note: "Hébergement choisi, accès contrôlé" },
              { name: "Évolutif", note: "Nouvelles fonctions à la demande" },
              { name: "Multi-organisations", note: "Plusieurs entités, un seul système" },
              { name: "Rôles & accès", note: "Chacun voit ce qui le concerne" },
            ].map((t) => (
              <div className="saturn-tech__pill" key={t.name}>
                <span className="saturn-tech__pill-name">{t.name}</span>
                <span className="saturn-tech__pill-note">{t.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="saturn-caps saturn-reveal">
        <div className="saturn-caps__inner">
          <h2 className="saturn-caps__title">Ce que fait Saturn.</h2>
          <div className="saturn-caps__grid">
            {[
              { icon: "🚗", title: "Demandes de convoi", desc: "Vos vendeurs créent leurs demandes de transport VO ou VN en quelques clics. Plus de mail, plus de téléphone." },
              { icon: "🗺️", title: "Suivi des flux", desc: "Chaque mouvement de véhicule entre vos sites est enregistré. Vous savez où est chaque véhicule, à tout moment." },
              { icon: "🚐", title: "Tournées chauffeurs", desc: "Préparez les tournées, affectez les livraisons. La feuille de route est générée automatiquement." },
              { icon: "🔍", title: "Retrouver un véhicule", desc: "Un véhicule introuvable ? Saturn interroge tout votre réseau en un clic et centralise les réponses." },
              { icon: "📦", title: "Inventaire", desc: "Vue d'ensemble de vos véhicules : où ils sont, quel est leur statut, ce qui arrive et ce qui part." },
              { icon: "👤", title: "Accès par rôle", desc: "Chaque collaborateur — vendeur, chauffeur, responsable — accède uniquement à ce qui le concerne." },
              { icon: "🏢", title: "Multi-concessions", desc: "Gérez plusieurs entités dans un seul système. Chacune conserve ses données, sa configuration, ses accès." },
              { icon: "🔔", title: "Notifications", desc: "Vos équipes sont automatiquement notifiées à chaque étape clé. Moins d'appels, moins d'oublis." },
              { icon: "📊", title: "Tableau de bord", desc: "Suivez l'activité en temps réel : livraisons en cours, tournées du jour, stock disponible, indicateurs." },
            ].map((cap) => (
              <div className="saturn-cap" key={cap.title}>
                <span className="saturn-cap__icon">{cap.icon}</span>
                <h3 className="saturn-cap__title">{cap.title}</h3>
                <p className="saturn-cap__desc">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="saturn-closing saturn-reveal">
        <div className="saturn-closing__inner">
          <p className="saturn-closing__eyebrow">Construit par Skym</p>
          <h2 className="saturn-closing__title">Saturn.</h2>
          <p className="saturn-closing__sub">
            Un système conçu pour des concessions automobiles, de A à Z. Pas un abonnement à un logiciel que personne ne comprend. Juste ce qu'il faut, là où il faut.
          </p>
          <Link href="/" className="saturn-closing__back">
            Retour au portfolio
          </Link>
        </div>
      </section>
    </div>
  )
}
