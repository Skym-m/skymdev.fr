export default function HeroClouds() {
  return (
    <div className="hero-clouds" aria-hidden="true">

      {/* Cloud 1 — top left, SVG starts at left:0, cloud shape near left edge */}
      <svg
        className="hero-cloud hero-cloud--1"
        viewBox="0 0 500 210"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        overflow="visible"
      >
        <defs>
          <filter
            id="c1-glow"
            x="-150"
            y="-140"
            width="760"
            height="460"
            filterUnits="userSpaceOnUse"
          >
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter
            id="c1-body"
            x="-140"
            y="-120"
            width="740"
            height="420"
            filterUnits="userSpaceOnUse"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018 0.028"
              numOctaves="4"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="18"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation="7" />
          </filter>
          <filter
            id="c1-highlight"
            x="-120"
            y="-100"
            width="700"
            height="360"
            filterUnits="userSpaceOnUse"
          >
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* Ambient glow */}
        <g filter="url(#c1-glow)" opacity="0.35">
          <ellipse cx="220" cy="158" rx="200" ry="48" fill="rgba(145,175,255,1)" />
          <circle cx="100" cy="112" r="66" fill="rgba(158,188,255,1)" />
          <circle cx="210" cy="86" r="80" fill="rgba(168,198,255,1)" />
          <circle cx="318" cy="104" r="64" fill="rgba(152,182,255,1)" />
          <circle cx="390" cy="132" r="44" fill="rgba(142,172,255,1)" />
        </g>

        {/* Cloud body */}
        <g filter="url(#c1-body)" opacity="0.82">
          <ellipse cx="220" cy="162" rx="195" ry="40" fill="rgba(178,206,255,0.44)" />
          <circle cx="90"  cy="112" r="60" fill="rgba(195,220,255,0.42)" />
          <circle cx="205" cy="86"  r="75" fill="rgba(208,228,255,0.46)" />
          <circle cx="312" cy="104" r="60" fill="rgba(196,220,255,0.40)" />
          <circle cx="376" cy="130" r="42" fill="rgba(182,208,255,0.32)" />
          <circle cx="44"  cy="138" r="38" fill="rgba(175,202,255,0.28)" />
          <circle cx="152" cy="72"  r="38" fill="rgba(200,224,255,0.35)" />
          <circle cx="270" cy="74"  r="34" fill="rgba(198,222,255,0.32)" />
        </g>

        {/* Highlight rim */}
        <g filter="url(#c1-highlight)" opacity="0.42">
          <circle cx="205" cy="78"  r="42" fill="rgba(235,244,255,0.6)" />
          <circle cx="120" cy="96"  r="26" fill="rgba(230,241,255,0.5)" />
          <circle cx="292" cy="86"  r="24" fill="rgba(228,240,255,0.45)" />
          <circle cx="158" cy="64"  r="18" fill="rgba(240,248,255,0.55)" />
        </g>
      </svg>

      {/* Cloud 2 — bottom right, SVG starts at right:0, cloud shape near right edge */}
      <svg
        className="hero-cloud hero-cloud--2"
        viewBox="0 0 580 230"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        overflow="visible"
      >
        <defs>
          <filter
            id="c2-glow"
            x="-170"
            y="-150"
            width="900"
            height="520"
            filterUnits="userSpaceOnUse"
          >
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <filter
            id="c2-body"
            x="-160"
            y="-130"
            width="880"
            height="470"
            filterUnits="userSpaceOnUse"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014 0.022"
              numOctaves="4"
              seed="13"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="22"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation="9" />
          </filter>
          <filter
            id="c2-highlight"
            x="-140"
            y="-110"
            width="840"
            height="400"
            filterUnits="userSpaceOnUse"
          >
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Ambient glow */}
        <g filter="url(#c2-glow)" opacity="0.28">
          <ellipse cx="350" cy="178" rx="218" ry="52" fill="rgba(135,168,255,1)" />
          <circle cx="220" cy="128" r="76" fill="rgba(142,175,255,1)" />
          <circle cx="340" cy="96"  r="96" fill="rgba(150,182,255,1)" />
          <circle cx="460" cy="116" r="80" fill="rgba(140,173,255,1)" />
          <circle cx="520" cy="152" r="56" fill="rgba(132,165,255,1)" />
        </g>

        {/* Cloud body */}
        <g filter="url(#c2-body)" opacity="0.72">
          <ellipse cx="350" cy="180" rx="212" ry="44" fill="rgba(168,198,255,0.38)" />
          <circle cx="212" cy="128" r="70" fill="rgba(180,208,255,0.36)" />
          <circle cx="334" cy="96"  r="90" fill="rgba(192,216,255,0.40)" />
          <circle cx="454" cy="116" r="74" fill="rgba(178,206,255,0.36)" />
          <circle cx="526" cy="154" r="50" fill="rgba(165,195,255,0.28)" />
          <circle cx="130" cy="158" r="46" fill="rgba(160,190,255,0.24)" />
          <circle cx="260" cy="80"  r="44" fill="rgba(188,214,255,0.33)" />
          <circle cx="404" cy="84"  r="42" fill="rgba(184,212,255,0.30)" />
          <circle cx="514" cy="106" r="36" fill="rgba(172,200,255,0.26)" />
        </g>

        {/* Highlight rim */}
        <g filter="url(#c2-highlight)" opacity="0.35">
          <circle cx="334" cy="88"  r="50" fill="rgba(232,242,255,0.55)" />
          <circle cx="240" cy="112" r="32" fill="rgba(228,240,255,0.48)" />
          <circle cx="440" cy="100" r="34" fill="rgba(228,240,255,0.44)" />
          <circle cx="260" cy="72"  r="22" fill="rgba(238,247,255,0.52)" />
          <circle cx="420" cy="76"  r="20" fill="rgba(236,246,255,0.48)" />
        </g>
      </svg>

    </div>
  )
}
