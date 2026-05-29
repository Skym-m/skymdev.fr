import Link from "next/link"

type HomeNavLink = {
  href: string
  label: string
  current?: boolean
}

const homeNavLinks: HomeNavLink[] = [
  {
    href: "/",
    label: "Accueil",
    current: true,
  },
  {
    href: "/saturn",
    label: "Saturn",
  },
  {
    href: "/code",
    label: "Code",
  },
] as const

export default function HomeNav() {
  return (
    <nav className="home-nav" aria-label="Navigation principale">
      {homeNavLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="home-nav__link"
          aria-current={link.current ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
