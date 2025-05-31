'use client'

import { useState } from 'react'
import { urlFor } from '@/sanity/lib/image'
import { PortableText } from '@portabletext/react'

export default function ProjectList({ projects }: { projects: any[] }) {
    const [selectedProject, setSelectedProject] = useState<any>(null)

    return (
        <>
            <section id="wrapper">
                <h1>Tous mes projets</h1>
                <div className="wrapper">
                    {projects.map((project) => (
                        <div
                            key={project._id}
                            className="card_wrapper"
                            onClick={() => setSelectedProject(project)}
                            style={{
                                backgroundImage: project.image ? `url(${urlFor(project.image).url()})` : 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <div className="card_summary">
                                <h3>{project.title}</h3>
                                <h4>
                                    Création :{' '}
                                    {new Date(project.date).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                    })}
                                </h4>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {selectedProject && (
                <div
                    className="project_modal"
                    onClick={() => setSelectedProject(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Détails du projet ${selectedProject.title}`}
                >
                    <div className="modal_grid" onClick={(e) => e.stopPropagation()}>
                        <div className="top_left">
                            {selectedProject.image && (
                                <img src={urlFor(selectedProject.image).url()} alt={selectedProject.title} />
                            )}
                        </div>
                        <div className="top_right">
                            <h1>{selectedProject.title}</h1>
                        </div>
                        <div className="bottom_left">
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
                                    ☁️ Télécharger le fichier associé ({selectedProject.fileName})
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
                                    🌐 Voir le projet
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