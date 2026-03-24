import { footerCta, footerLinks } from "@/app/data/siteContent"
import FooterScene from "./footer/FooterScene"

const Footer = () => {
  return (
    <footer className="site-footer">
      <section className="footer-garden" aria-labelledby="footer-title">
        <FooterScene reducedMotion={false} />

        <div className="section-shell footer-content">
          <div className="footer-stage">
            <p className="section-eyebrow footer-stage-eyebrow">{footerCta.eyebrow}</p>
            <h2 id="footer-title" className="footer-signature">
              Skym
            </h2>
          </div>

          <div className="footer-bottom">
            <div className="footer-copy">
              <p className="footer-tagline">{footerCta.title}</p>
              <a href={footerCta.primaryAction.href} className="footer-action">
                {footerCta.primaryAction.label}
              </a>
            </div>

            <div className="footer-meta">
              <span>skymdev.fr par Skym, fait à Privas</span>
              <div className="footer-meta-links">
                {footerLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </footer>
  )
}

export default Footer
