"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ui/theme-toggle";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navBgOpacity = scrolled ? 0.92 : 0.2;
  const navBlur = scrolled ? 24 : 16;

  return (
    <nav 
      className="font-sans sticky top-0 z-50 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] transition-all duration-500 sm:px-6"
      style={{
        backgroundColor: `rgba(var(--bg-primary-rgb, 255, 255, 255), ${navBgOpacity})`,
        backdropFilter: `blur(${navBlur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${navBlur}px) saturate(180%)`,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="hidden min-w-0 flex-1 items-center gap-8 lg:flex">
          <Link
            href="/"
            className="tracking-tight transition-all hover:opacity-50"
          >
            Home
          </Link>
          <Link
            href="/analyze"
            className="tracking-tight transition-all hover:opacity-50"
          >
            Analyze
          </Link>
          <Link
            href="/services"
            className="tracking-tight transition-all hover:opacity-50"
          >
            Services
          </Link>
        </div>

        <Link
          href="/"
          className="font-quicktext flex items-center justify-center px-2 py-1 text-[1.5rem] leading-none text-[var(--text-primary)]"
          aria-label="Kryptos home"
        >
          Kryptos
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-5">
          <Link
            href="/docs"
            className="tracking-tight transition-all hover:opacity-50"
          >
            Docs
          </Link>
          <Link
            href="/login"
            className="hidden tracking-tight transition-all hover:opacity-50 sm:inline-flex"
          >
            Login
          </Link>
          <ThemeToggle />
          <Link
            href="/connect-wallet"
            className="rounded-full border border-[var(--border)] bg-[var(--text-primary)] px-4 py-1.5 text-xs tracking-tight text-[var(--bg-primary)] transition-all duration-300 hover:opacity-80"
          >
            Connect
          </Link>
        </div>
      </div>
    </nav>
  );
}
