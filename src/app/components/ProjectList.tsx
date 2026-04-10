'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { getSanityImageUrl } from '@/sanity/lib/image'
import { PortableText } from '@portabletext/react'

import type { Project } from '@/app/types/project'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

type ProjectListProps = {
  projects: Project[]
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function ProjectList({ projects }: ProjectListProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const previousBodyOverflowRef = useRef<string | null>(null)
  const modalImageUrl = selectedProject?.image
    ? getSanityImageUrl(selectedProject.image, { width: 1800, quality: 86 })
    : null

  useEffect(() => {
    if (!selectedProject) {
      return
    }

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedProject(null)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const dialog = dialogRef.current
      if (!dialog) {
        return
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => {
        const styles = window.getComputedStyle(element)

        return styles.display !== 'none' && styles.visibility !== 'hidden'
      })

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null

      if (event.shiftKey && (activeElement === firstElement || activeElement === dialog)) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)

      if (previousBodyOverflowRef.current) {
        document.body.style.overflow = previousBodyOverflowRef.current
      } else {
        document.body.style.removeProperty('overflow')
      }

      lastFocusedElementRef.current?.focus()
    }
  }, [selectedProject])

  return (
    <>
      <section id="wrapper" className="content-section">
        <div className="section-shell">
          <p className="section-eyebrow">Travaux</p>
          <h2>Tous mes projets</h2>
          {projects.length === 0 ? (
            <p className="empty-state">Aucun projet n&apos;est disponible pour le moment.</p>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => {
                const cardImageUrl = project.image
                  ? getSanityImageUrl(project.image, { width: 1200, quality: 82 })
                  : null

                return (
                  <button
                    key={project._id}
                    type="button"
                    className="project-card"
                    onClick={() => setSelectedProject(project)}
                    style={{
                      backgroundImage: cardImageUrl ? `url("${cardImageUrl}")` : 'none',
                    }}
                  >
                    <span className="project-card__overlay" />
                    <span className="project-card__content">
                      <span className="project-card__title">{project.title}</span>
                      <span className="project-card__meta">
                        {project.date
                          ? `Création : ${dateFormatter.format(new Date(project.date))}`
                          : 'Date inconnue'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {selectedProject && (
        <div
          className="project_modal"
          onClick={() => setSelectedProject(null)}
        >
          <div
            ref={dialogRef}
            className="modal_grid"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="modal_close"
              onClick={() => setSelectedProject(null)}
              aria-label="Fermer la fenêtre du projet"
            >
              ×
            </button>
            <div className="top_left">
              {modalImageUrl ? (
                <Image
                  src={modalImageUrl}
                  alt={selectedProject.title}
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 60vw"
                />
              ) : null}
            </div>
            <div className="top_right">
              <p className="section-eyebrow">Projet</p>
              <h3 id={titleId}>{selectedProject.title}</h3>
              {selectedProject.date && (
                <p className="modal_date">
                  Créé le {dateFormatter.format(new Date(selectedProject.date))}
                </p>
              )}
            </div>
            <div className="bottom_left" id={descriptionId}>
              {selectedProject.description ? (
                <PortableText value={selectedProject.description} />
              ) : (
                <p>Pas de description dispo.</p>
              )}
            </div>
            <div className="bottom_right">
              {selectedProject.fileUrl ? (
                <a
                  href={selectedProject.fileUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project_download"
                >
                  Télécharger le fichier associé
                  {selectedProject.fileName ? ` (${selectedProject.fileName})` : ''}
                </a>
              ) : (
                <p>Aucun fichier associé.</p>
              )}

              {selectedProject.url ? (
                <a
                  href={selectedProject.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project_btn"
                >
                  Voir le projet
                </a>
              ) : (
                <p>Pas de lien vers le projet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
