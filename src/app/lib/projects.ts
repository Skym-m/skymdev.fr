import { client } from "@/sanity/lib/client"

import type { Project } from "@/app/types/project"

const projectsQuery = `*[_type == "project"] | order(date desc) {
  _id,
  title,
  url,
  image,
  date,
  description,
  "fileUrl": file.asset->url,
  "fileName": file.asset->originalFilename
}`

export async function getProjects() {
  return client.fetch<Project[]>(projectsQuery)
}
