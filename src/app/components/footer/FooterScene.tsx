'use client'

import dynamic from "next/dynamic"

import type { FooterSceneCanvasProps } from "./FooterSceneCanvas"

const FooterSceneCanvas = dynamic(() => import("./FooterSceneCanvas"), {
  ssr: false,
})

export default function FooterScene(props: FooterSceneCanvasProps) {
  return <FooterSceneCanvas {...props} />
}
