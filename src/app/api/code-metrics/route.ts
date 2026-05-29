import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { getCachedGithubCodeMetrics } from "@/app/lib/github-code-metrics"

export const runtime = "nodejs"

function timingSafeStringEqual(candidate: string | null, expected: string): boolean {
  if (!candidate) return false
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  )
}

function isRefreshAuthorized(request: NextRequest): boolean {
  const expectedToken = process.env.CODE_METRICS_REFRESH_TOKEN?.trim()
  if (!expectedToken) return false

  return timingSafeStringEqual(
    request.headers.get("x-code-metrics-refresh-token") ??
      request.nextUrl.searchParams.get("refreshToken"),
    expectedToken,
  )
}

export async function GET(request: NextRequest) {
  const wantsRefresh = request.nextUrl.searchParams.get("refresh") === "1"
  const metrics = await getCachedGithubCodeMetrics({
    forceRefresh: wantsRefresh && isRefreshAuthorized(request),
  })

  return NextResponse.json(metrics, {
    headers: {
      "Cache-Control": `public, s-maxage=${metrics.cacheSeconds}, stale-while-revalidate=${metrics.cacheSeconds}`,
    },
  })
}
