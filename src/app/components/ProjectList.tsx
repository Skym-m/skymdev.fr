'use client'

import { useEffect, useId, useState } from 'react'
import { urlFor } from '@/sanity/lib/image'
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

export default function ProjectList({ projects }: ProjectListProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!selectedProject) {
      document.body.style.removeProperty('overflow')
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedProject(null)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.removeProperty('overflow')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedProject])

  return (
    <>
      <section id="wrapper" className="content-section">
        <div className="section-shell">
          <p className="section-eyebrow">Travaux</p>
          <h2>Tous mes projets</h2>
          {projects.length === 0 ? (
            <p className="empty-state">Aucun projet n'est disponible pour le moment.</p>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <button
                  key={project._id}
                  type="button"
                  className="project-card"
                  onClick={() => setSelectedProject(project)}
                  style={{
                    backgroundImage: project.image ? `url(${urlFor(project.image).url()})` : 'none',
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
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedProject && (
        <div
          className="project_modal"
          onClick={() => setSelectedProject(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <div className="modal_grid" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="modal_close"
              onClick={() => setSelectedProject(null)}
              aria-label="Fermer la fenêtre du projet"
            >
              ×
            </button>
            <div className="top_left">
              {selectedProject.image ? (
                <img src={urlFor(selectedProject.image).url()} alt={selectedProject.title} />
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
