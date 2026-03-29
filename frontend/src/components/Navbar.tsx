"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LOGO_SVG = (
  <svg width="32" height="32" viewBox="0 0 680 500" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <style>{`
      @keyframes navSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes navSpinRed  { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      .nav-spin-blue { transform-origin: 340px 215px; animation: navSpinBlue 2.5s linear infinite; }
      .nav-spin-red  { transform-origin: 340px 215px; animation: navSpinRed  2.5s linear infinite; }
    `}</style>
    <defs>
      <radialGradient id="navLgCg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#a0c8ff" stopOpacity="0.12"/>
        <stop offset="50%" stopColor="#ff6060" stopOpacity="0.06"/>
        <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id="navLgBf" cx="40%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#ffffff"/>
        <stop offset="70%" stopColor="#dce8f2"/>
        <stop offset="100%" stopColor="#b8cfe0"/>
      </radialGradient>
    </defs>
    <circle cx="340" cy="215" r="178" fill="url(#navLgCg)"/>
    <g className="nav-spin-blue">
      <circle cx="340" cy="215" r="178" fill="none" stroke="#1565C0" strokeWidth="7" strokeLinecap="round" strokeDasharray="280 840" opacity=".9"/>
      <circle cx="340" cy="215" r="153" fill="none" stroke="#1976D2" strokeWidth="5" strokeLinecap="round" strokeDasharray="240 721" opacity=".7"/>
      <circle cx="340" cy="215" r="125" fill="none" stroke="#42A5F5" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="196 589" opacity=".6"/>
    </g>
    <g className="nav-spin-red">
      <circle cx="340" cy="215" r="178" fill="none" stroke="#B71C1C" strokeWidth="7" strokeLinecap="round" strokeDasharray="280 840" opacity=".9"/>
      <circle cx="340" cy="215" r="153" fill="none" stroke="#C62828" strokeWidth="5" strokeLinecap="round" strokeDasharray="240 721" opacity=".7"/>
      <circle cx="340" cy="215" r="125" fill="none" stroke="#EF5350" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="196 589" opacity=".6"/>
    </g>
    <ellipse cx="340" cy="195" rx="86" ry="80" fill="url(#navLgBf)" stroke="#b8cce0" strokeWidth="2"/>
    <ellipse cx="305" cy="186" rx="13" ry="14" fill="#1a1a2e"/>
    <ellipse cx="375" cy="186" rx="13" ry="14" fill="#1a1a2e"/>
    <ellipse cx="310" cy="180" rx="5" ry="5" fill="white"/>
    <ellipse cx="380" cy="180" rx="5" ry="5" fill="white"/>
    <ellipse cx="340" cy="216" rx="17" ry="12" fill="#1a1a2e"/>
    <path d="M 326 234 Q 340 248 354 234" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/term-key", label: "Term Key" },
  { href: "/traction-analytics", label: "Traction Analytics" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setDark(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-6 backdrop-blur md:px-10">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          {LOGO_SVG}
          <span
            className="font-bold text-xl tracking-tight"
            style={{
              background: "linear-gradient(90deg, var(--accent-blue), var(--accent-red))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Polarity
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: pathname === link.href ? "var(--text)" : "var(--text2)",
                background: pathname === link.href ? "var(--surface2)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:flex items-center gap-1.5 text-sm" style={{ color: "var(--green)" }}>
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--green)" }} />
          Live
        </span>
        <button
          onClick={() => setDark((d) => !d)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-1.5 transition-colors"
          style={{ color: "var(--text2)" }}
          aria-label="Toggle dark mode"
        >
          {dark ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}
