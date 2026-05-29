import { createHash } from "node:crypto"
import { gunzipSync } from "node:zlib"

const GITHUB_API_BASE_URL = "https://api.github.com"
const GITHUB_CODELOAD_BASE_URL = "https://codeload.github.com"
const DEFAULT_CACHE_SECONDS = 60 * 60 * 6
const DEFAULT_MAX_FILE_BYTES = 1_000_000
const DEFAULT_HISTORY_POINTS = 8

const CACHE_SECONDS = parsePositiveInteger(
  process.env.GITHUB_CODE_METRICS_CACHE_SECONDS,
  DEFAULT_CACHE_SECONDS,
)
const MAX_SOURCE_FILE_BYTES = parsePositiveInteger(
  process.env.GITHUB_CODE_METRICS_MAX_FILE_BYTES,
  DEFAULT_MAX_FILE_BYTES,
)
const HISTORY_POINTS = clamp(
  parsePositiveInteger(process.env.GITHUB_CODE_METRICS_HISTORY_POINTS, DEFAULT_HISTORY_POINTS),
  3,
  12,
)

const IGNORED_PATH_SEGMENTS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
])

const IGNORED_FILE_NAMES = new Set([
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
])

const SOURCE_FILE_NAMES = new Set([
  ".babelrc",
  ".dockerignore",
  ".env.example",
  ".eslintrc",
  ".gitignore",
  ".prettierrc",
  "CMakeLists.txt",
  "Dockerfile",
  "Makefile",
  "Procfile",
])

const EXTENSION_LANGUAGE: Record<string, string> = {
  astro: "Astro",
  c: "C",
  cc: "C++",
  clj: "Clojure",
  cpp: "C++",
  cs: "C#",
  css: "CSS",
  dart: "Dart",
  ex: "Elixir",
  exs: "Elixir",
  fs: "F#",
  go: "Go",
  graphql: "GraphQL",
  h: "C/C++",
  hpp: "C++",
  html: "HTML",
  java: "Java",
  js: "JavaScript",
  json: "JSON",
  jsonc: "JSON",
  jsx: "JavaScript",
  kt: "Kotlin",
  kts: "Kotlin",
  less: "Less",
  lua: "Lua",
  m: "Objective-C",
  mdx: "MDX",
  mm: "Objective-C++",
  php: "PHP",
  prisma: "Prisma",
  py: "Python",
  rb: "Ruby",
  rs: "Rust",
  sass: "Sass",
  scss: "Sass",
  sh: "Shell",
  sql: "SQL",
  svelte: "Svelte",
  swift: "Swift",
  toml: "TOML",
  ts: "TypeScript",
  tsx: "TypeScript",
  vue: "Vue",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  zig: "Zig",
}

type AuthorizedRepository = {
  owner: string
  repo: string
  ref?: string
}

type GithubRepositoryResponse = {
  created_at: string
  default_branch: string
  full_name: string
  html_url: string
  pushed_at: string | null
}

type GithubCommitResponse = {
  commit: {
    author?: {
      date?: string | null
    } | null
    committer?: {
      date?: string | null
    } | null
  }
  sha: string
}

type CountableFile = {
  content: string
  path: string
  size: number
  language: string
}

type CountedFile = CountableFile & {
  lines: number
}

type GithubCodeMetricsCacheEntry = {
  expiresAt: number
  key: string
  metrics: GithubCodeMetrics
}

export type GithubCodeMetricLanguage = {
  files: number
  language: string
  lines: number
  share: number
}

export type GithubCodeMetricHistoryPoint = {
  date: string
  files: number
  lines: number
  ref: string
}

export type GithubCodeMetricRepository = {
  branch: string
  files: number
  fullName: string
  history: GithubCodeMetricHistoryPoint[]
  historyError: string | null
  htmlUrl: string
  languages: GithubCodeMetricLanguage[]
  lines: number
  pushedAt: string | null
}

export type GithubCodeMetricsError = {
  message: string
  repository: string
}

export type GithubCodeMetrics = {
  cacheSeconds: number
  configured: boolean
  errors: GithubCodeMetricsError[]
  generatedAt: string
  maxFileBytes: number
  repositories: GithubCodeMetricRepository[]
  totalFiles: number
  totalLines: number
}

let metricsCache: GithubCodeMetricsCacheEntry | null = null

class GithubCodeMetricsFetchError extends Error {
  constructor(
    message: string,
    readonly repository: string,
  ) {
    super(message)
    this.name = "GithubCodeMetricsFetchError"
  }
}

export async function getCachedGithubCodeMetrics(options: { forceRefresh?: boolean } = {}) {
  const cacheKey = getConfigCacheKey()
  const now = Date.now()

  if (
    !options.forceRefresh &&
    metricsCache &&
    metricsCache.key === cacheKey &&
    metricsCache.expiresAt > now
  ) {
    return metricsCache.metrics
  }

  const metrics = await getGithubCodeMetrics()
  metricsCache = {
    expiresAt: now + CACHE_SECONDS * 1000,
    key: cacheKey,
    metrics,
  }

  return metrics
}

async function getGithubCodeMetrics(): Promise<GithubCodeMetrics> {
  const authorizedRepositories = parseAuthorizedRepositories(
    process.env.GITHUB_CODE_METRICS_REPOSITORIES,
  )

  if (authorizedRepositories.length === 0) {
    return {
      cacheSeconds: CACHE_SECONDS,
      configured: false,
      errors: [],
      generatedAt: new Date().toISOString(),
      maxFileBytes: MAX_SOURCE_FILE_BYTES,
      repositories: [],
      totalFiles: 0,
      totalLines: 0,
    }
  }

  const results = await Promise.all(
    authorizedRepositories.map(async (repository) => {
      try {
        return {
          repository: await countRepository(repository),
        }
      } catch (error) {
        return {
          error: normalizeRepositoryError(error, repository),
        }
      }
    }),
  )

  const repositories = results
    .flatMap((result) => (result.repository ? [result.repository] : []))
    .sort((first, second) => second.lines - first.lines)
  const errors = results.flatMap((result) => (result.error ? [result.error] : []))

  return {
    cacheSeconds: CACHE_SECONDS,
    configured: true,
    errors,
    generatedAt: new Date().toISOString(),
    maxFileBytes: MAX_SOURCE_FILE_BYTES,
    repositories,
    totalFiles: repositories.reduce((total, repository) => total + repository.files, 0),
    totalLines: repositories.reduce((total, repository) => total + repository.lines, 0),
  }
}

async function countRepository(
  repository: AuthorizedRepository,
): Promise<GithubCodeMetricRepository> {
  const repositoryLabel = formatRepositoryLabel(repository)
  const details = repository.ref
    ? null
    : await githubGet<GithubRepositoryResponse>(
        `/repos/${repository.owner}/${repository.repo}`,
        repositoryLabel,
      )
  const ref = repository.ref ?? details?.default_branch

  if (!ref) {
    throw new GithubCodeMetricsFetchError(
      "Aucune branche n'est configurée et la branche par défaut n'a pas pu être récupérée.",
      repositoryLabel,
    )
  }

  const sourceFiles = await readRepositoryArchive(repository, ref)
  const lines = sourceFiles.reduce((total, file) => total + file.lines, 0)
  const historyResult = await getRepositoryHistory(repository, ref, details, {
    files: sourceFiles.length,
    lines,
  })

  return {
    branch: ref,
    files: sourceFiles.length,
    fullName: details?.full_name ?? `${repository.owner}/${repository.repo}`,
    history: historyResult.history,
    historyError: historyResult.error,
    htmlUrl: details?.html_url ?? `https://github.com/${repository.owner}/${repository.repo}`,
    languages: getLanguageBreakdown(sourceFiles, lines),
    lines,
    pushedAt: details?.pushed_at ?? null,
  }
}

async function getRepositoryHistory(
  repository: AuthorizedRepository,
  ref: string,
  knownDetails: GithubRepositoryResponse | null,
  current: { files: number; lines: number },
): Promise<{ error: string | null; history: GithubCodeMetricHistoryPoint[] }> {
  try {
    const repositoryLabel = formatRepositoryLabel(repository)
    const details =
      knownDetails ??
      (await githubGet<GithubRepositoryResponse>(
        `/repos/${repository.owner}/${repository.repo}`,
        repositoryLabel,
      ))
    const snapshotDates = getSnapshotDates(new Date(details.created_at), new Date())
    const commits = await Promise.all(
      snapshotDates.map(async (date) => getCommitBeforeDate(repository, ref, date)),
    )
    const uniqueCommits = dedupeHistoryCommits(
      commits.filter((commit): commit is { date: string; sha: string } => Boolean(commit)),
    )
    const history = await Promise.all(
      uniqueCommits.map(async (commit, index) => {
        if (index === uniqueCommits.length - 1) {
          return {
            date: commit.date,
            files: current.files,
            lines: current.lines,
            ref: commit.sha,
          }
        }

        const files = await readRepositoryArchive(repository, commit.sha)

        return {
          date: commit.date,
          files: files.length,
          lines: files.reduce((total, file) => total + file.lines, 0),
          ref: commit.sha,
        }
      }),
    )

    return {
      error: null,
      history,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Historique indisponible.",
      history: [],
    }
  }
}

async function getCommitBeforeDate(
  repository: AuthorizedRepository,
  ref: string,
  date: Date,
) {
  const repositoryLabel = formatRepositoryLabel(repository)
  const commits = await githubGet<GithubCommitResponse[]>(
    `/repos/${repository.owner}/${repository.repo}/commits?sha=${encodeURIComponent(ref)}&until=${encodeURIComponent(date.toISOString())}&per_page=1`,
    repositoryLabel,
  )
  const commit = commits[0]

  if (!commit) {
    return null
  }

  return {
    date: commit.commit.author?.date ?? commit.commit.committer?.date ?? date.toISOString(),
    sha: commit.sha,
  }
}

async function readRepositoryArchive(
  repository: AuthorizedRepository,
  ref: string,
): Promise<CountedFile[]> {
  const repositoryLabel = formatRepositoryLabel(repository)
  const archive = await githubGetArchiveArrayBuffer(
    `${GITHUB_CODELOAD_BASE_URL}/${repository.owner}/${repository.repo}/tar.gz/${encodeURIComponent(ref)}`,
    repositoryLabel,
  )
  const tar = gunzipSync(Buffer.from(archive))
  const files: CountedFile[] = []
  let offset = 0

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)

    if (isEmptyTarBlock(header)) {
      break
    }

    const name = readTarString(header, 0, 100)
    const size = readTarOctal(header, 124, 12)
    const type = readTarString(header, 156, 1) || "0"
    const prefix = readTarString(header, 345, 155)
    const archivedPath = [prefix, name].filter(Boolean).join("/")
    const path = stripArchiveRoot(archivedPath)
    const contentStart = offset + 512
    const contentEnd = contentStart + size
    const nextOffset = contentStart + Math.ceil(size / 512) * 512
    offset = nextOffset

    if (type !== "0" || !path || !isSourcePath(path) || size > MAX_SOURCE_FILE_BYTES) {
      continue
    }

    const content = tar.subarray(contentStart, contentEnd).toString("utf8")

    if (!content || content.includes("\0")) {
      continue
    }

    files.push({
      content,
      language: getLanguageFromPath(path),
      lines: countNonEmptyLines(content),
      path,
      size,
    })
  }

  return files
}

async function githubGet<T>(path: string, repositoryLabel: string): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  const token = process.env.GITHUB_CODE_METRICS_TOKEN

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    headers,
    next: {
      revalidate: CACHE_SECONDS,
    },
  })

  if (!response.ok) {
    const githubMessage = await getGithubErrorMessage(response)

    throw new GithubCodeMetricsFetchError(
      [
        `GitHub a répondu ${response.status} ${response.statusText}.`,
        githubMessage,
      ]
        .filter(Boolean)
        .join(" "),
      repositoryLabel,
    )
  }

  return (await response.json()) as T
}

async function githubGetArchiveArrayBuffer(url: string, repositoryLabel: string) {
  const headers: HeadersInit = {
    Accept: "application/x-gzip",
  }
  const token = process.env.GITHUB_CODE_METRICS_TOKEN

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    const githubMessage = await getResponseErrorMessage(response)

    throw new GithubCodeMetricsFetchError(
      [
        `GitHub a répondu ${response.status} ${response.statusText}.`,
        githubMessage,
      ]
        .filter(Boolean)
        .join(" "),
      repositoryLabel,
    )
  }

  return response.arrayBuffer()
}

async function getGithubErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    return typeof body.message === "string" ? body.message : ""
  } catch {
    return ""
  }
}

async function getResponseErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return getGithubErrorMessage(response)
  }

  try {
    return (await response.text()).trim()
  } catch {
    return ""
  }
}

function parseAuthorizedRepositories(value: string | undefined): AuthorizedRepository[] {
  if (!value) {
    return []
  }

  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [repositoryPart, ref] = item.split(/[#$@]/)
      const [owner, repo] = repositoryPart.split("/")

      if (!owner || !repo) {
        throw new Error(`Repository GitHub invalide: "${item}". Format attendu: owner/repo.`)
      }

      return {
        owner,
        repo,
        ref: ref || undefined,
      }
    })
}

function isSourcePath(path: string) {
  if (shouldIgnorePath(path)) {
    return false
  }

  const fileName = path.split("/").at(-1) ?? path

  if (IGNORED_FILE_NAMES.has(fileName)) {
    return false
  }

  if (SOURCE_FILE_NAMES.has(fileName)) {
    return true
  }

  const extension = getExtension(fileName)

  return Boolean(extension && EXTENSION_LANGUAGE[extension])
}

function shouldIgnorePath(path: string) {
  return path.split("/").some((segment) => IGNORED_PATH_SEGMENTS.has(segment))
}

function getLanguageFromPath(path: string) {
  const fileName = path.split("/").at(-1) ?? path

  if (SOURCE_FILE_NAMES.has(fileName)) {
    return fileName.startsWith(".") ? "Config" : fileName
  }

  const extension = getExtension(fileName)

  return extension ? EXTENSION_LANGUAGE[extension] ?? "Autre" : "Autre"
}

function getExtension(fileName: string) {
  const parts = fileName.split(".")

  return parts.length > 1 ? parts.at(-1)?.toLowerCase() : undefined
}

function countNonEmptyLines(content: string) {
  return content
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim().length > 0).length
}

function getLanguageBreakdown(files: CountedFile[], totalLines: number) {
  const languageStats = files.reduce<Record<string, { files: number; lines: number }>>(
    (stats, file) => {
      stats[file.language] ??= {
        files: 0,
        lines: 0,
      }
      stats[file.language].files += 1
      stats[file.language].lines += file.lines

      return stats
    },
    {},
  )

  return Object.entries(languageStats)
    .map(([language, stats]) => ({
      files: stats.files,
      language,
      lines: stats.lines,
      share: totalLines > 0 ? stats.lines / totalLines : 0,
    }))
    .sort((first, second) => second.lines - first.lines)
}

function getSnapshotDates(createdAt: Date, now: Date) {
  const start = Number.isFinite(createdAt.getTime()) ? createdAt : now
  const startTime = start.getTime()
  const endTime = now.getTime()

  if (endTime <= startTime) {
    return [now]
  }

  return Array.from({ length: HISTORY_POINTS }, (_, index) => {
    const ratio = HISTORY_POINTS === 1 ? 1 : index / (HISTORY_POINTS - 1)

    return new Date(startTime + (endTime - startTime) * ratio)
  })
}

function dedupeHistoryCommits(commits: Array<{ date: string; sha: string }>) {
  const commitsBySha = new Map<string, { date: string; sha: string }>()

  for (const commit of commits) {
    commitsBySha.set(commit.sha, commit)
  }

  return Array.from(commitsBySha.values()).sort(
    (first, second) => new Date(first.date).getTime() - new Date(second.date).getTime(),
  )
}

function normalizeRepositoryError(
  error: unknown,
  repository: AuthorizedRepository,
): GithubCodeMetricsError {
  if (error instanceof GithubCodeMetricsFetchError) {
    return {
      message: error.message,
      repository: error.repository,
    }
  }

  return {
    message: error instanceof Error ? error.message : "Erreur inconnue.",
    repository: formatRepositoryLabel(repository),
  }
}

function isEmptyTarBlock(block: Buffer) {
  return block.every((byte) => byte === 0)
}

function readTarString(block: Buffer, offset: number, length: number) {
  const value = block.subarray(offset, offset + length)
  const end = value.indexOf(0)

  return value.subarray(0, end === -1 ? value.length : end).toString("utf8")
}

function readTarOctal(block: Buffer, offset: number, length: number) {
  const value = readTarString(block, offset, length).trim()

  return value ? Number.parseInt(value, 8) : 0
}

function stripArchiveRoot(path: string) {
  const [, ...segments] = path.split("/")

  return segments.join("/")
}

function formatRepositoryLabel(repository: AuthorizedRepository) {
  return `${repository.owner}/${repository.repo}${repository.ref ? `#${repository.ref}` : ""}`
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsedValue = Number.parseInt(value, 10)

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getConfigCacheKey() {
  return createHash("sha256")
    .update(process.env.GITHUB_CODE_METRICS_REPOSITORIES ?? "")
    .update("\0")
    .update(process.env.GITHUB_CODE_METRICS_TOKEN ?? "")
    .update("\0")
    .update(String(CACHE_SECONDS))
    .update("\0")
    .update(String(MAX_SOURCE_FILE_BYTES))
    .update("\0")
    .update(String(HISTORY_POINTS))
    .digest("hex")
}
