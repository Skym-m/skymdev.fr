import { createImageUrlBuilder } from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url'

import { dataset, projectId } from '../env'

// https://www.sanity.io/docs/image-url
const builder = createImageUrlBuilder({ projectId, dataset })

export const urlFor = (source: SanityImageSource) => {
  return builder.image(source)
}

type SanityImageOptions = {
  width?: number
  height?: number
  quality?: number
}

export function getSanityImageUrl(
  source: SanityImageSource,
  options: SanityImageOptions = {},
) {
  let image = builder.image(source).auto('format').fit('max')

  if (options.width) {
    image = image.width(options.width)
  }

  if (options.height) {
    image = image.height(options.height)
  }

  if (options.quality) {
    image = image.quality(options.quality)
  }

  return image.url()
}
