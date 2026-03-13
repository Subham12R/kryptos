"use client";

import { useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DATA_CHARS = "u/)(L0DMCQj}{ZXYVIJK";
const COLS = 80;
const ROWS = 24;

function DataArtGraphic() {
  const rows = useMemo(() => {
    const result: string[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: string[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push(DATA_CHARS[Math.floor(Math.random() * DATA_CHARS.length)]);
      }
      result.push(row);
    }
    return result;
  }, []);

  return (
    <div
      className="relative mx-auto max-w-5xl overflow-hidden py-16"
      style={{
        maskImage: "radial-gradient(ellipse 70% 50% at 50% 50%, black 20%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 50%, black 20%, transparent 70%)",
      }}
    >
      <pre className="font-mono text-[10px] leading-[14px] text-[var(--text-secondary)] font-features-[normal] sm:text-xs sm:leading-[16px]" style={{ letterSpacing: "0.08em" }}>
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center">
            {row.map((char, ci) => {
              const dist = Math.sqrt(Math.pow(ci - COLS / 2, 2) + Math.pow(ri - ROWS / 2, 2));
              const maxDist = Math.sqrt(Math.pow(COLS / 2, 2) + Math.pow(ROWS / 2, 2));
              const opacity = Math.max(0.15, 0.7 - (dist / maxDist) * 0.6);
              return (
                <span key={ci} style={{ opacity }} className="inline-block">
                  {char}
                </span>
              );
            })}
          </div>
        ))}
      </pre>
    </div>
  );
}

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dataArtRef = useRef<HTMLDivElement>(null);
  const copyrightRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(contentRef.current?.children || [], {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: footerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(dataArtRef.current, {
        opacity: 0,
        y: 30,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: dataArtRef.current,
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(copyrightRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 0.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: copyrightRef.current,
          start: "top 95%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(watermarkRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: watermarkRef.current,
          start: "top 95%",
          toggleActions: "play none none reverse",
        },
      });
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="relative overflow-hidden bg-[var(--bg-primary)] pt-24 pb-24">
      <div ref={contentRef} className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-16 px-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 lg:px-8 xl:px-12">
        <div>
          <h3 className="font-sans text-2xl tracking-[-0.02em] text-[var(--text-primary)] sm:text-3xl">
            Don&apos;t miss out on future updates.
          </h3>
          <form className="mt-8 space-y-3" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Name"
              className="w-full border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 font-sans text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--text-primary)] focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 font-sans text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--text-primary)] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="border border-[var(--text-primary)] bg-[var(--text-primary)] px-6 py-3 font-sans text-xs uppercase tracking-[0.2em] text-[var(--bg-primary)] transition hover:opacity-80"
              >
                Subscribe
              </button>
              <button
                type="button"
                aria-label="Add"
                className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)]"
              >
                +
              </button>
            </div>
          </form>
          <p className="mt-4 font-sans text-sm text-[var(--text-secondary)]">
            Unsubscribe anytime.
          </p>
          <div className="mt-8 space-y-2 font-sans text-sm uppercase tracking-[0.12em] text-[var(--text-primary)]">
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 bg-[var(--text-primary)]" />
              Accepting projects. Join the waitlist.
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 bg-[var(--text-primary)]" />
              Only 3 spots left
            </p>
          </div>
        </div>

        <div>
          <nav className="flex flex-col gap-4 font-sans text-sm uppercase tracking-[0.2em] text-[var(--text-primary)]">
            <Link href="/" className="transition hover:opacity-60">
              Home
            </Link>
            <Link href="/analyze" className="transition hover:opacity-60">
              Analyze
            </Link>
            <Link href="/services" className="transition hover:opacity-60">
              Services
            </Link>
            <Link href="/docs" className="transition hover:opacity-60">
              Docs
            </Link>
            <Link href="/contact" className="transition hover:opacity-60">
              Contact
            </Link>
          </nav>
        </div>

        <div>
          <div className="space-y-3 font-sans text-sm text-[var(--text-primary)]">
            <a href="mailto:contact@kryptos.io" className="block underline transition hover:no-underline hover:opacity-60">
              contact@kryptos.io
            </a>
            <a href="mailto:team@kryptos.io" className="block underline transition hover:no-underline hover:opacity-60">
              team@kryptos.io
            </a>
            <a href="mailto:partners@kryptos.io" className="block underline transition hover:no-underline hover:opacity-60">
              partners@kryptos.io
            </a>
          </div>
          <div className="mt-8 space-y-2 font-sans text-sm text-[var(--text-primary)]">
            <Link href="/privacy" className="block underline transition hover:no-underline hover:opacity-60">
              Privacy Policy
            </Link>
            <Link href="/legal" className="block underline transition hover:no-underline hover:opacity-60">
              Legal Notice
            </Link>
          </div>
        </div>
      </div>

      <div ref={dataArtRef}>
        <DataArtGraphic />
      </div>

      <div ref={copyrightRef} className="relative z-10 mt-12 text-center font-sans text-sm text-[var(--text-secondary)]">
        <p>© 2026</p>
        <p className="mt-1 font-quicktext tracking-tight text-[var(--text-primary)]">
          Kryptos
        </p>
        <p className="mt-1">Onchain intelligence.</p>
      </div>

      <div
        ref={watermarkRef}
        className="pointer-events-none absolute mx-auto -bottom-8 left-1/2 -translate-x-1/2 select-none font-quicktext text-[clamp(8rem,20vw,20rem)] font-black uppercase leading-none tracking-[-0.04em] text-[var(--text-secondary)]/20"
        aria-hidden
      >
        Kryptos
      </div>
    </footer>
  );
}
