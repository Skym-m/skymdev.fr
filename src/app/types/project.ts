import type { SanityImageSource } from "@sanity/image-url"
import type { TypedObject } from "sanity"

export type Project = {
  _id: string
  title: string
  url?: string
  image?: SanityImageSource
  date?: string
  description?: TypedObject[]
  fileUrl?: string
  fileName?: string
}
