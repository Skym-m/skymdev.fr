import type { Metadata } from "next"
import Link from "next/link"

import {
  getCachedGithubCodeMetrics,
  type GithubCodeMetricHistoryPoint,
} from "@/app/lib/github-code-metrics"

export const metadata: Metadata = {
  title: "Observatoire technique | SkymDev",
  description:
    "La face technique des projets SkymDev : repositories maintenus, lignes écrites, langages utilisés et évolution dans le temps.",
}

export const runtime = "nodejs"

const numberFormatter = new Intl.NumberFormat("fr-FR")
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
})
const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
})

export default async function CodeMetricsPage() {
  const metrics = await getCachedGithubCodeMetrics()
  const maxLines = Math.max(
    ...metrics.repositories.map((repository) => repository.lines),
    1,
  )

  return (
    <main className="code-observatory-page">
      <nav className="code-observatory-nav" aria-label="Navigation de la page observatoire technique">
        <Link href="/" className="code-observatory-nav__back">
          ← Retour au portfolio
        </Link>
        <span className="code-observatory-nav__brand">SkymDev</span>
      </nav>

      <section className="code-observatory-hero">
        <div className="code-observatory-hero__bg" aria-hidden="true" />
        <div className="code-observatory-hero__content">
          <p className="code-observatory-hero__eyebrow">Sous la vitrine</p>
          <h1>
            <span>La vitrine</span>
            <span>ne montre</span>
            <span>pas tout.</span>
          </h1>
          <p>
            Sites, outils, interfaces : derrière chaque rendu propre, il y a du code
            qui s&apos;écrit, se corrige et continue d&apos;avancer. Cette page en garde la
            trace, un repository après l&apos;autre.
          </p>
        </div>
      </section>

      <section className="code-observatory-section" aria-labelledby="code-metrics-title">
        <div className="section-shell">
          <div className="code-observatory-summary">
            <div>
              <p className="section-eyebrow">Code réellement suivi</p>
              <h2 id="code-metrics-title">
                {numberFormatter.format(metrics.totalLines)}
              </h2>
            </div>
            <dl className="code-observatory-stats">
              <div>
                <dt>Repositories analysés</dt>
                <dd>{numberFormatter.format(metrics.repositories.length)}</dd>
              </div>
              <div>
                <dt>Fichiers retenus</dt>
                <dd>{numberFormatter.format(metrics.totalFiles)}</dd>
              </div>
              <div>
                <dt>Dernière synchronisation</dt>
                <dd>{dateFormatter.format(new Date(metrics.generatedAt))}</dd>
              </div>
            </dl>
          </div>

          {!metrics.configured ? (
            <div className="code-observatory-empty" role="status">
              L&apos;observatoire est prêt, mais aucun repository n&apos;est connecté pour le moment.
            </div>
          ) : null}

          {metrics.repositories.length > 0 ? (
            <div className="code-observatory-chart" role="list">
              {metrics.repositories.map((repository) => {
                const width = `${Math.max((repository.lines / maxLines) * 100, 3)}%`

                return (
                  <details
                    className="code-observatory-row"
                    key={repository.fullName}
                    role="listitem"
                  >
                    <summary className="code-observatory-row__summary">
                      <span className="code-observatory-row__header">
                        <span>
                          <h3>{repository.fullName}</h3>
                          <p>
                            Branche analysée : {repository.branch}
                            {repository.pushedAt
                              ? ` · dernière activité le ${dateFormatter.format(new Date(repository.pushedAt))}`
                              : ""}
                          </p>
                        </span>
                        <span className="code-observatory-row__toggle" aria-hidden="true">
                          ↓
                        </span>
                      </span>
                      <span
                        className="code-observatory-bar"
                        aria-label={`${repository.fullName}: ${numberFormatter.format(repository.lines)} lignes de code`}
                      >
                        <span style={{ width }} />
                      </span>
                      <span className="code-observatory-row__footer">
                        <strong>{numberFormatter.format(repository.lines)} lignes</strong>
                        <span>{numberFormatter.format(repository.files)} fichiers source</span>
                      </span>
                      {repository.languages.length > 0 ? (
                        <span className="code-observatory-languages" aria-label="Langages détectés">
                          {repository.languages.slice(0, 4).map((language) => (
                            <span key={language.language}>
                              <span>{language.language}</span>
                              <strong>{numberFormatter.format(language.lines)}</strong>
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </summary>
                    <div className="code-observatory-row__details">
                      {repository.history.length > 1 ? (
                        <HistoryChart history={repository.history} />
                      ) : (
                        <p className="code-observatory-history__empty">
                          {repository.historyError ??
                            "Pas encore assez de points de mesure pour afficher une trajectoire fiable."}
                        </p>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          ) : null}

          {metrics.errors.length > 0 ? (
            <div className="code-observatory-errors" role="status">
              <h2>Quelques repositories sont temporairement indisponibles</h2>
              <ul>
                {metrics.errors.map((error) => (
                  <li key={error.repository}>
                    <strong>{error.repository}</strong> · {error.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="code-observatory-note">
            Les compteurs ignorent les dépendances, les builds et les fichiers
            générés pour rester au plus près du code réellement écrit.
          </p>
        </div>
      </section>
    </main>
  )
}

function HistoryChart({ history }: { history: GithubCodeMetricHistoryPoint[] }) {
  const width = 820
  const height = 260
  const paddingX = 34
  const paddingY = 28
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2
  const maxLines = Math.max(...history.map((point) => point.lines), 1)
  const startTime = new Date(history[0].date).getTime()
  const endTime = new Date(history.at(-1)?.date ?? history[0].date).getTime()
  const timeRange = Math.max(endTime - startTime, 1)
  const points = history.map((point) => {
    const time = new Date(point.date).getTime()
    const x = paddingX + ((time - startTime) / timeRange) * chartWidth
    const y = paddingY + chartHeight - (point.lines / maxLines) * chartHeight

    return {
      ...point,
      x,
      y,
    }
  })
  const linePath = points.map((point) => `${point.x},${point.y}`).join(" ")
  const areaPath = [
    `${points[0].x},${height - paddingY}`,
    linePath,
    `${points.at(-1)?.x ?? points[0].x},${height - paddingY}`,
  ].join(" ")
  const firstPoint = history[0]
  const lastPoint = history.at(-1) ?? firstPoint
  const growth = lastPoint.lines - firstPoint.lines
  const chartId = lastPoint.ref.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "current"
  const lineGradientId = `codeHistoryLine-${chartId}`
  const areaGradientId = `codeHistoryArea-${chartId}`

  return (
    <div className="code-observatory-history">
      <div className="code-observatory-history__header">
        <div>
          <h4>Trajectoire du repository</h4>
          <p>
            De {shortDateFormatter.format(new Date(firstPoint.date))} à{" "}
            {shortDateFormatter.format(new Date(lastPoint.date))}
          </p>
        </div>
        <strong>
          +{numberFormatter.format(Math.max(growth, 0))} lignes
        </strong>
      </div>
      <svg
        className="code-observatory-history__chart"
        role="img"
        aria-label="Graphique de l'évolution du nombre de lignes de code"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={lineGradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#78a8ff" />
            <stop offset="100%" stopColor="#39d8ff" />
          </linearGradient>
          <linearGradient id={areaGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4fa3ff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#4fa3ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={height - paddingY}
          y2={height - paddingY}
          className="code-observatory-history__axis"
        />
        <polyline
          points={areaPath}
          className="code-observatory-history__area"
          fill={`url(#${areaGradientId})`}
        />
        <polyline
          points={linePath}
          className="code-observatory-history__line"
          stroke={`url(#${lineGradientId})`}
        />
        {points.map((point) => (
            <circle
              key={`${point.ref}-${point.date}`}
              cx={point.x}
              cy={point.y}
              r="4.5"
              className="code-observatory-history__point"
            >
              <title>
              {`${shortDateFormatter.format(new Date(point.date))} · ${numberFormatter.format(point.lines)} lignes`}
              </title>
            </circle>
          ))}
      </svg>
      <div className="code-observatory-history__scale" aria-hidden="true">
        <span>{numberFormatter.format(firstPoint.lines)} lignes</span>
        <span>{numberFormatter.format(lastPoint.lines)} lignes</span>
      </div>
    </div>
  )
}
