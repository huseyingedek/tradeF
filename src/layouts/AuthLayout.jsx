import { FaFacebookF, FaXTwitter, FaLinkedinIn } from 'react-icons/fa6'
import Logo from '../components/Logo'

// Sağ taraftaki dekoratif alan – tamamen SVG ile çizilmiştir (harici görsel yok)
function ArtBackground() {
  const dots = []
  for (let y = 0; y < 7; y++) for (let x = 0; x < 8; x++) dots.push([620 + x * 26 - y * 6, 700 + y * 24])
  return (
    <svg className="art-bg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fd3ff" />
          <stop offset="1" stopColor="#3a5bff" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#ffb21e" />
        </linearGradient>
      </defs>
      <circle cx="420" cy="40" r="150" fill="url(#g1)" />
      <circle cx="420" cy="40" r="95" fill="#4a12b0" />
      <circle cx="420" cy="40" r="52" fill="url(#g2)" />
      <circle cx="40" cy="300" r="140" fill="url(#g1)" opacity="0.9" />
      <circle cx="40" cy="300" r="80" fill="#3a0a8c" />
      <circle cx="680" cy="980" r="190" fill="url(#g1)" />
      <circle cx="680" cy="980" r="120" fill="#2a0870" />
      <path d="M760 900c-60-80 40-160 120-120v220H700c40-30 70-60 60-100z" fill="url(#g2)" />
      <path d="M-40 120c80-60 160 0 140 70-20 70-120 60-140 20z" fill="url(#g2)" />
      <path d="M0 520 C200 500 300 380 330 230 S 520 80 700 -20" stroke="#5fb8ff" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M800 420 C760 600 640 720 420 760 S 160 900 120 1040" stroke="#5fb8ff" strokeWidth="2" fill="none" opacity="0.7" />
      <circle cx="470" cy="140" r="12" fill="#ffc542" />
      <circle cx="430" cy="185" r="7" fill="#ffc542" />
      <circle cx="530" cy="790" r="12" fill="#ffc542" />
      <circle cx="575" cy="760" r="7" fill="#ffc542" />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" fill="#7a5cff" opacity="0.55" />
      ))}
    </svg>
  )
}

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-page">
      <div className="auth-form-side">
        <div className="auth-card">{children}</div>
      </div>
      <div className="auth-art-side">
        <ArtBackground />
        <div className="art-content">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Logo size={58} textClass="fs-1 fw-bold fst-italic" />
          </div>
          <h2 className="text-white mb-3" style={{ fontSize: '2rem' }}>{title}</h2>
          <p className="mb-4" style={{ opacity: 0.9, lineHeight: 1.8 }}>{subtitle}</p>
          <div className="social">
            <a href="#" aria-label="Facebook"><FaFacebookF /></a>
            <a href="#" aria-label="X"><FaXTwitter /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedinIn /></a>
          </div>
        </div>
      </div>
    </div>
  )
}
