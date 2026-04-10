import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next-routine-check/**"],
    rules: {
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]

export default config
