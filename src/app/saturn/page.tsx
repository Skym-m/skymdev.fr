"use client"

import Link from "next/link"
import { useEffect, useRef, useCallback } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/dist/ScrollTrigger"
import { useTheme } from "../components/ThemeProvider"

/* ── Features data ── */
const FEATURES = [
  {
    eyebrow: "Convois véhicules",
    title: "VO, VN.\nConvoyés. Point.",
    desc: "Un vendeur crée une demande de convoi en quelques clics depuis sa concession. Le transporteur la reçoit, planifie, assigne. Chaque étape est enregistrée — de la commande à la livraison.",
    items: [
      "Véhicules d'occasion et neufs gérés séparément",
      "Le vendeur suit l'avancement en temps réel",
      "Le transporteur voit tout ce qu'il doit prendre en charge",
      "Historique complet de chaque demande",
    ],
    img: "login",
    alt: "Saturn — interface de connexion",
  },
  {
    eyebrow: "Flux logistiques",
    title: "Des concessions\naux dépôts.",
    desc: "Plusieurs sites, plusieurs dépôts ? Saturn suit chaque véhicule d'un bout à l'autre du réseau. Qui l'a reçu, quand, depuis où — tout est visible, sans avoir à décrocher le téléphone.",
    items: [
      "Tous vos sites référencés dans un seul système",
      "Réceptions, expéditions, transferts sur un seul écran",
      "Chaque mouvement enregistré et consultable à tout moment",
      "Vous savez où est chaque véhicule, en temps réel",
    ],
    img: "flux",
    alt: "Saturn — flux logistiques",
  },
  {
    eyebrow: "Tournées & chauffeurs",
    title: "Le bon chauffeur.\nLa bonne tournée.",
    desc: "Préparez une tournée, assignez les véhicules à livrer. Saturn génère automatiquement la feuille de route du chauffeur. Rien à imprimer à la main, rien à dicter par téléphone.",
    items: [
      "Tournées créées et organisées en quelques minutes",
      "Feuille de route PDF générée automatiquement",
      "Le chauffeur voit ses missions, et uniquement elles",
      "Une fois validée, la tournée est figée — pas de surprise",
    ],
    img: "stock",
    alt: "Saturn — tournées chauffeurs",
  },
  {
    eyebrow: "Localisation",
    title: "Perdu un véhicule ?\nSaturn le retrouve.",
    desc: "Un véhicule n'est plus là où il devrait être ? Lancez une recherche en quelques secondes. Saturn interroge automatiquement tout le réseau de concessions — et centralise les réponses.",
    items: [
      "Recherche lancée depuis n'importe quel site",
      "Tout le réseau est interrogé automatiquement",
      "Chaque concession peut confirmer ou infirmer",
      "Historique de toutes les recherches conservé",
    ],
    img: "interface",
    alt: "Saturn — localisation de véhicule",
  },
]

export default function SaturnPage() {
  const theme = useTheme()
  const cardGlowCleanup = useRef<(() => void) | null>(null)

  const screen = (name: string) =>
    theme === "day" ? `/saturn/${name}-day.png` : `/saturn/${name}.png`

  // ── Mouse-follow glow for cards ──
  const initCardGlow = useCallback(() => {
    const cards = document.querySelectorAll<HTMLElement>(
      ".saturn-role, .saturn-avail__card, .saturn-cap"
    )

    cards.forEach((card) => {
      if (card.querySelector(".saturn-card-glow")) return
      const glow = document.createElement("div")
      glow.className = "saturn-card-glow"
      card.prepend(glow)

      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect()
        glow.style.transform = `translate(${e.clientX - rect.left - 110}px, ${e.clientY - rect.top - 110}px)`
        glow.style.opacity = "1"
      }
      const onLeave = () => {
        glow.style.opacity = "0"
      }

      card.addEventListener("mousemove", onMove)
      card.addEventListener("mouseleave", onLeave)
      ;(card as any).__glowCleanup = () => {
        card.removeEventListener("mousemove", onMove)
        card.removeEventListener("mouseleave", onLeave)
      }
    })

    return () => {
      cards.forEach((card) => {
        ;(card as any).__glowCleanup?.()
        card.querySelector(".saturn-card-glow")?.remove()
      })
    }
  }, [])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const showcaseCopies = Array.from(
      document.querySelectorAll<HTMLElement>(".saturn-showcase-copy")
    )
    const showcaseImages = Array.from(
      document.querySelectorAll<HTMLElement>(".saturn-showcase-img")
    )
    const progressFill = document.querySelector<HTMLElement>(
      ".saturn-showcase__progress-fill"
    )

    let activeFeature = -1

    const setActiveFeature = (index: number) => {
      if (index === activeFeature) return
      activeFeature = index

      showcaseCopies.forEach((copy, i) => {
        copy.classList.toggle("is-active", i === index)
      })

      showcaseImages.forEach((image, i) => {
        image.classList.toggle("is-active", i === index)
      })
    }

    const animateStatements = (start: string, end: string, scrub: number) => {
      document
        .querySelectorAll<HTMLElement>(".saturn-statement")
        .forEach((section) => {
          const inner = section.querySelector<HTMLElement>(".saturn-statement__inner")
          if (!inner) return

          gsap.fromTo(
            inner,
            { opacity: 0.22, y: 48, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start,
                end,
                scrub,
              },
            }
          )
        })
    }

    const scrubCards = (
      sectionSel: string,
      cardSel: string,
      headerSel: string,
      start: string,
      end: string
    ) => {
      gsap.fromTo(
        headerSel,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          ease: "none",
          scrollTrigger: {
            trigger: sectionSel,
            start,
            end,
            scrub: 0.45,
          },
        }
      )

      document.querySelectorAll<HTMLElement>(cardSel).forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 34, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              end: "top 62%",
              scrub: 0.35,
            },
          }
        )
      })
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document
        .querySelectorAll<HTMLElement>(
          ".saturn-reveal, .saturn-hero__content, .saturn-hero__mockup, .saturn-showcase-copy, .saturn-showcase-img, .saturn-statement__inner, .saturn-closing__inner"
        )
        .forEach((el) => {
          el.style.opacity = "1"
          el.style.transform = "none"
          el.style.filter = "none"
        })

      setActiveFeature(0)
      if (progressFill) {
        gsap.set(progressFill, { scaleX: 1 })
      }

      cardGlowCleanup.current = initCardGlow()

      return () => {
        cardGlowCleanup.current?.()
      }
    }

    document.querySelectorAll<HTMLElement>(".saturn-reveal").forEach((el) => {
      if (el.closest(".saturn-hero")) return
      el.style.opacity = "1"
      el.style.transform = "none"
      el.style.transition = "none"
    })

    setActiveFeature(0)
    if (progressFill) {
      gsap.set(progressFill, { scaleX: 0 })
    }

    ScrollTrigger.matchMedia({
      "(min-width: 769px)": () => {
        const heroTl = gsap.timeline({
          scrollTrigger: {
            trigger: ".saturn-hero",
            start: "top top",
            end: "+=420",
            pin: true,
            scrub: 0.35,
            pinSpacing: true,
          },
        })

        heroTl
          .to(
            ".saturn-hero__content",
            { y: -48, opacity: 0.04, scale: 0.94, ease: "none" },
            0
          )
          .to(
            ".saturn-hero__mockup",
            { y: -36, opacity: 0.24, scale: 0.98, ease: "none" },
            0
          )
          .to(
            ".saturn-hero__glow",
            { opacity: 0, scale: 1.12, ease: "none" },
            0
          )

        animateStatements("top 82%", "top 42%", 0.35)

        ScrollTrigger.create({
          trigger: ".saturn-showcase",
          start: "top top",
          end: `+=${FEATURES.length * 420}`,
          pin: true,
          scrub: 0.15,
          pinSpacing: true,
          onUpdate: (self) => {
            const nextIndex = Math.min(
              FEATURES.length - 1,
              Math.floor(self.progress * FEATURES.length)
            )

            setActiveFeature(nextIndex)

            if (progressFill) {
              gsap.set(progressFill, { scaleX: self.progress })
            }
          },
        })

        scrubCards(
          ".saturn-roles",
          ".saturn-role",
          ".saturn-roles__eyebrow, .saturn-roles__title, .saturn-roles__sub",
          "top 82%",
          "top 48%"
        )
        scrubCards(
          ".saturn-avail",
          ".saturn-avail__card",
          ".saturn-avail__eyebrow, .saturn-avail__title, .saturn-avail__sub",
          "top 82%",
          "top 48%"
        )
        scrubCards(
          ".saturn-caps",
          ".saturn-cap",
          ".saturn-caps__title",
          "top 82%",
          "top 48%"
        )

        gsap.fromTo(
          ".saturn-tech__eyebrow, .saturn-tech__title, .saturn-tech__sub",
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.13,
            ease: "none",
            scrollTrigger: {
              trigger: ".saturn-tech",
              start: "top 82%",
              end: "top 48%",
              scrub: 0.45,
            },
          }
        )
        gsap.fromTo(
          ".saturn-tech__pill",
          { opacity: 0, scale: 0.8, y: 12 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            stagger: 0.04,
            ease: "none",
            scrollTrigger: {
              trigger: ".saturn-tech__stack",
              start: "top 85%",
              end: "top 52%",
              scrub: 0.45,
            },
          }
        )

        document
          .querySelectorAll<HTMLElement>(".saturn-divider")
          .forEach((line) => {
            gsap.fromTo(
              line,
              { width: "0%" },
              {
                width: "40%",
                ease: "none",
                scrollTrigger: {
                  trigger: line,
                  start: "top 88%",
                  end: "top 54%",
                  scrub: 0.4,
                },
              }
            )
          })

        gsap.fromTo(
          ".saturn-closing__inner",
          { opacity: 0.18, y: 44, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".saturn-closing",
              start: "top 82%",
              end: "top 42%",
              scrub: 0.4,
            },
          }
        )

        cardGlowCleanup.current = initCardGlow()
      },

      "(max-width: 768px)": () => {
        showcaseCopies.forEach((copy) => copy.classList.add("is-active"))
        setActiveFeature(0)
        if (progressFill) {
          gsap.set(progressFill, { scaleX: 1 })
        }

        gsap.to(".saturn-hero__content", {
          y: -16,
          ease: "none",
          scrollTrigger: {
            trigger: ".saturn-hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        })

        animateStatements("top 88%", "top 58%", 0.45)

        gsap.fromTo(
          ".saturn-showcase__frame",
          { opacity: 0, scale: 0.94, y: 30 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".saturn-showcase",
              start: "top 80%",
              end: "top 50%",
              scrub: 0.5,
            },
          }
        )

        document
          .querySelectorAll<HTMLElement>(".saturn-showcase-copy")
          .forEach((copy) => {
            gsap.fromTo(
              copy,
              { opacity: 0, y: 30 },
              {
                opacity: 1,
                y: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: copy,
                  start: "top 85%",
                  end: "top 55%",
                  scrub: 0.5,
                },
              }
            )
          })

        scrubCards(
          ".saturn-roles",
          ".saturn-role",
          ".saturn-roles__eyebrow, .saturn-roles__title, .saturn-roles__sub",
          "top 84%",
          "top 58%"
        )
        scrubCards(
          ".saturn-avail",
          ".saturn-avail__card",
          ".saturn-avail__eyebrow, .saturn-avail__title, .saturn-avail__sub",
          "top 84%",
          "top 58%"
        )
        scrubCards(
          ".saturn-caps",
          ".saturn-cap",
          ".saturn-caps__title",
          "top 84%",
          "top 58%"
        )

        gsap.fromTo(
          ".saturn-tech__eyebrow, .saturn-tech__title, .saturn-tech__sub",
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.13,
            ease: "none",
            scrollTrigger: {
              trigger: ".saturn-tech",
              start: "top 82%",
              end: "top 55%",
              scrub: 0.5,
            },
          }
        )
        gsap.fromTo(
          ".saturn-tech__pill",
          { opacity: 0, scale: 0.82, y: 10 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            stagger: 0.04,
            ease: "none",
            scrollTrigger: {
              trigger: ".saturn-tech__stack",
              start: "top 85%",
              end: "top 55%",
              scrub: 0.5,
            },
          }
        )

        document
          .querySelectorAll<HTMLElement>(".saturn-divider")
          .forEach((line) => {
            gsap.fromTo(
              line,
              { width: "0%" },
              {
                width: "60%",
                ease: "none",
                scrollTrigger: {
                  trigger: line,
                  start: "top 88%",
                  end: "top 55%",
                  scrub: 0.4,
                },
              }
            )
          })

        gsap.fromTo(
          ".saturn-closing__inner",
          { opacity: 0.16, y: 28, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".saturn-closing",
              start: "top 80%",
              end: "top 42%",
              scrub: 0.45,
            },
          }
        )
      },
    })

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
      cardGlowCleanup.current?.()
    }
  }, [initCardGlow, theme])

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

      {/* ── Hero ── */}
      <section className="saturn-hero">
        <div className="saturn-hero__bg" />
        <div className="saturn-hero__content">
          <p className="saturn-hero__eyebrow">Système de gestion interne</p>
          <h1 className="saturn-hero__title">
            Saturn.
            <span className="saturn-hero__shimmer" aria-hidden="true">
              Saturn.
            </span>
          </h1>
          <p className="saturn-hero__sub">
            Gestion de convois de véhicules,
            <br />
            de flux logistiques et de stock.
          </p>
          <p className="saturn-hero__tagline">
            Conçu pour des concessions automobiles. Chaque véhicule, tracé.
            Chaque livraison, confirmée.
          </p>
        </div>
        <div className="saturn-hero__mockup saturn-reveal">
          <div className="saturn-hero__glow" aria-hidden="true" />
          <div className="saturn-mockup-shell">
            <div className="saturn-mockup-bar">
              <span />
              <span />
              <span />
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

      <hr className="saturn-divider" aria-hidden="true" />

      {/* ── Statement 1 ── */}
      <section className="saturn-statement saturn-reveal">
        <div className="saturn-statement__inner">
          <p className="saturn-statement__line">
            Saturn, ça marche,{" "}
            <span className="saturn-statement__accent">et c&apos;est tout.</span>
          </p>
        </div>
      </section>

      {/* ── Features Showcase — Pinned crossfade (desktop) ── */}
      <section className="saturn-showcase saturn-reveal">
        <div className="saturn-showcase__inner">
          {/* Left — Copy track */}
          <div className="saturn-showcase__copy-track">
            {FEATURES.map((f, i) => (
              <div className="saturn-showcase-copy" data-idx={i} key={f.eyebrow}>
                <p className="saturn-feature__eyebrow">{f.eyebrow}</p>
                <h2 className="saturn-feature__title">
                  {f.title.split("\n").map((line, j) => (
                    <span key={j}>
                      {j > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </h2>
                <p className="saturn-feature__desc">{f.desc}</p>
                <ul className="saturn-feature__list">
                  {f.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Right — Screen frame with stacked images */}
          <div className="saturn-showcase__screen">
            <div className="saturn-showcase__frame">
              {FEATURES.map((f, i) => (
                <img
                  className="saturn-showcase-img"
                  data-idx={i}
                  key={screen(f.img)}
                  src={screen(f.img)}
                  alt={f.alt}
                />
              ))}
              <div className="saturn-screen-placeholder">
                <span>Saturn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="saturn-showcase__progress">
          <div className="saturn-showcase__progress-fill" />
        </div>
      </section>

      {/* ── Statement 2 ── */}
      <section className="saturn-statement saturn-statement--sm saturn-reveal">
        <div className="saturn-statement__inner">
          <p className="saturn-statement__quote">
            &ldquo;Vendeur, transporteur, chauffeur.
            <br />
            Chacun voit ce qui le concerne. Rien de plus.&rdquo;
          </p>
        </div>
      </section>

      <hr className="saturn-divider" aria-hidden="true" />

      {/* ── Roles ── */}
      <section className="saturn-roles saturn-reveal">
        <div className="saturn-roles__inner">
          <p className="saturn-roles__eyebrow">Accès & rôles</p>
          <h2 className="saturn-roles__title">
            6 rôles.
            <br />6 vues. Zéro confusion.
          </h2>
          <p className="saturn-roles__sub">
            Chaque acteur accède à son tableau de bord dédié. Pas de menu
            générique — un espace pensé pour ce qu&apos;il fait.
          </p>
          <div className="saturn-roles__grid">
            {[
              {
                role: "Vendeur",
                desc: "Crée une demande de convoi depuis sa concession et suit son avancement jusqu'à la livraison. Sans passer par personne.",
              },
              {
                role: "Manager VO",
                desc: "Supervise les véhicules d'occasion de son garage. Voit ce qui entre, ce qui sort, ce qui est en attente.",
              },
              {
                role: "Manager VN",
                desc: "Même chose, côté véhicules neufs. Chaque marque, chaque entrée en stock, sous contrôle.",
              },
              {
                role: "Transporteur",
                desc: "Organise les tournées, assigne les chauffeurs, planifie les convois. Tout depuis un seul tableau de bord.",
              },
              {
                role: "Chauffeur",
                desc: "Ouvre Saturn et voit sa journée : les véhicules à livrer, les adresses, la feuille de route. Rien d'autre.",
              },
              {
                role: "Administrateur",
                desc: "Gère les utilisateurs, les garages, les droits d'accès et les paramètres. Vue complète sur l'activité du réseau.",
              },
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

      {/* ── Statement 3 ── */}
      <section className="saturn-statement saturn-statement--sm saturn-reveal">
        <div className="saturn-statement__inner">
          <p className="saturn-statement__quote">
            &ldquo;Pas de superflu. Juste ce qu&apos;il faut,
            <br />
            là où il faut.&rdquo;
          </p>
        </div>
      </section>

      {/* ── Availability ── */}
      <section className="saturn-avail saturn-reveal">
        <div className="saturn-avail__inner">
          <p className="saturn-avail__eyebrow">Disponibilité</p>
          <h2 className="saturn-avail__title">
            Partout.
            <br />
            Tout le temps.
          </h2>
          <p className="saturn-avail__sub">
            Téléphone sur le parking, tablette à la réception, ordinateur au
            bureau — même interface, mêmes données, en temps réel. Saturn
            fonctionne sur n&apos;importe quel appareil, n&apos;importe quel
            navigateur.
          </p>
          <div className="saturn-avail__grid">
            <div className="saturn-avail__card">
              <span className="saturn-avail__icon">📱</span>
              <h3 className="saturn-avail__card-title">
                Mobile, tablette, desktop
              </h3>
              <p className="saturn-avail__card-desc">
                L&apos;interface s&apos;adapte à l&apos;écran. Un chauffeur sur
                le terrain et un responsable à son bureau voient la même
                information, en simultané.
              </p>
            </div>
            <div className="saturn-avail__card">
              <span className="saturn-avail__icon">🌐</span>
              <h3 className="saturn-avail__card-title">
                Tout navigateur, sans installation
              </h3>
              <p className="saturn-avail__card-desc">
                Chrome, Safari, Firefox, Edge. Aucune application à télécharger,
                aucun logiciel à installer. Un lien, et c&apos;est accessible.
              </p>
            </div>
            <div className="saturn-avail__card saturn-avail__card--highlight">
              <span className="saturn-avail__icon">🤖</span>
              <h3 className="saturn-avail__card-title">
                Surveillé par intelligence artificielle
              </h3>
              <p className="saturn-avail__card-desc">
                Saturn est monitoré en permanence. Les anomalies sont détectées
                et corrigées en temps réel, avant même qu&apos;elles
                n&apos;impactent vos équipes. Pas d&apos;attente, pas de ticket
                de support.
              </p>
            </div>
            <div className="saturn-avail__card">
              <span className="saturn-avail__icon">🔧</span>
              <h3 className="saturn-avail__card-title">Maintenu en continu</h3>
              <p className="saturn-avail__card-desc">
                Mises à jour, correctifs, nouvelles fonctionnalités. Saturn
                évolue sans interruption de service. Vos équipes ne voient
                jamais la différence — sauf que ça s&apos;améliore.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ownership ── */}
      <section className="saturn-tech saturn-reveal">
        <div className="saturn-tech__inner">
          <p className="saturn-tech__eyebrow">Indépendance</p>
          <h2 className="saturn-tech__title">Conçu sans dépendance.</h2>
          <p className="saturn-tech__sub">
            Saturn n&apos;est pas un logiciel générique mal adapté. C&apos;est un
            système développé sur mesure, pour ce métier précis.
            L&apos;abonnement aussi est sur mesure — calculé en fonction de vos
            sites, de vos équipes et de votre usage réel. Pas de formule fixe,
            pas de fonctionnalité inutile payée chaque mois.
          </p>
          <div className="saturn-tech__stack">
            {[
              { name: "Sur mesure", note: "Zéro compromis fonctionnel" },
              {
                name: "Tarif sur mesure",
                note: "Adapté à vos sites et vos équipes",
              },
              {
                name: "Données maîtrisées",
                note: "Hébergement choisi, accès contrôlé",
              },
              {
                name: "Évolutif",
                note: "Nouvelles fonctions à la demande",
              },
              {
                name: "Multi-organisations",
                note: "Plusieurs entités, un seul système",
              },
              {
                name: "Rôles & accès",
                note: "Chacun voit ce qui le concerne",
              },
            ].map((t) => (
              <div className="saturn-tech__pill" key={t.name}>
                <span className="saturn-tech__pill-name">{t.name}</span>
                <span className="saturn-tech__pill-note">{t.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="saturn-divider" aria-hidden="true" />

      {/* ── Capabilities ── */}
      <section className="saturn-caps saturn-reveal">
        <div className="saturn-caps__inner">
          <h2 className="saturn-caps__title">Ce que fait Saturn.</h2>
          <div className="saturn-caps__grid">
            {[
              {
                icon: "🚗",
                title: "Demandes de convoi",
                desc: "Vos vendeurs créent leurs demandes de transport VO ou VN en quelques clics. Plus de mail, plus de téléphone.",
              },
              {
                icon: "🗺️",
                title: "Suivi des flux",
                desc: "Chaque mouvement de véhicule entre vos sites est enregistré. Vous savez où est chaque véhicule, à tout moment.",
              },
              {
                icon: "🚐",
                title: "Tournées chauffeurs",
                desc: "Préparez les tournées, affectez les livraisons. La feuille de route est générée automatiquement.",
              },
              {
                icon: "🔍",
                title: "Retrouver un véhicule",
                desc: "Un véhicule introuvable ? Saturn interroge tout votre réseau en un clic et centralise les réponses.",
              },
              {
                icon: "📦",
                title: "Inventaire",
                desc: "Vue d'ensemble de vos véhicules : où ils sont, quel est leur statut, ce qui arrive et ce qui part.",
              },
              {
                icon: "👤",
                title: "Accès par rôle",
                desc: "Chaque collaborateur — vendeur, chauffeur, responsable — accède uniquement à ce qui le concerne.",
              },
              {
                icon: "🏢",
                title: "Multi-concessions",
                desc: "Gérez plusieurs entités dans un seul système. Chacune conserve ses données, sa configuration, ses accès.",
              },
              {
                icon: "🔔",
                title: "Notifications",
                desc: "Vos équipes sont automatiquement notifiées à chaque étape clé. Moins d'appels, moins d'oublis.",
              },
              {
                icon: "📊",
                title: "Tableau de bord",
                desc: "Suivez l'activité en temps réel : livraisons en cours, tournées du jour, stock disponible, indicateurs.",
              },
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

      {/* ── Closing ── */}
      <section className="saturn-closing saturn-reveal">
        <div className="saturn-closing__inner">
          <p className="saturn-closing__eyebrow">Construit par Skym</p>
          <h2 className="saturn-closing__title">Saturn.</h2>
          <p className="saturn-closing__sub">
            Un système conçu pour des concessions automobiles, de A à Z. Pas un
            abonnement à un logiciel que personne ne comprend. Juste ce
            qu&apos;il faut, là où il faut.
          </p>
          <a
            href="mailto:yannis.perrier@icloud.com"
            className="saturn-closing__back"
          >
            Contact
          </a>
        </div>
      </section>
    </div>
  )
}
