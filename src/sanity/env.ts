export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-05-31'

const configuredDataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const configuredProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID

export const isSanityConfigured = Boolean(configuredDataset && configuredProjectId)

export const dataset = configuredDataset || 'production'
export const projectId = configuredProjectId || 'placeholder'
