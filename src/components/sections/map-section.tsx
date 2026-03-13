"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import WorldMap from "@/components/ui/world-map";

gsap.registerPlugin(ScrollTrigger);

const walletFlows = [
  { start: { lat: 37.7749, lng: -122.4194, label: "San Francisco" }, end: { lat: 1.3521, lng: 103.8198, label: "Singapore" } },
  { start: { lat: 51.5072, lng: -0.1276, label: "London" }, end: { lat: 25.2048, lng: 55.2708, label: "Dubai" } },
  { start: { lat: 35.6762, lng: 139.6503, label: "Tokyo" }, end: { lat: -33.8688, lng: 151.2093, label: "Sydney" } },
  { start: { lat: 40.7128, lng: -74.006, label: "New York" }, end: { lat: 52.52, lng: 13.405, label: "Berlin" } },
  { start: { lat: 19.076, lng: 72.8777, label: "Mumbai" }, end: { lat: 55.7558, lng: 37.6173, label: "Moscow" } },
];

const mapPins = [
  { id: "sf-dex", lat: 37.7749, lng: -122.4194, title: "San Francisco DEX Cluster", detail: "$2.4M swap burst", wallet: "0xa9f1...2c88" },
  { id: "singapore-otc", lat: 1.3521, lng: 103.8198, title: "Singapore OTC Desk", detail: "USDC routing leg", wallet: "0x4dd0...b91e" },
  { id: "london-bridge", lat: 51.5072, lng: -0.1276, title: "London Bridge Wallet", detail: "Cross-chain bridge", wallet: "0x74c2...9f01" },
  { id: "dubai-fund", lat: 25.2048, lng: 55.2708, title: "Dubai Treasury", detail: "$980K inflow", wallet: "0x81ab...77d3" },
  { id: "tokyo-vault", lat: 35.6762, lng: 139.6503, title: "Tokyo Vault", detail: "Liquidity rebalance", wallet: "0x1d0a...fe4b" },
  { id: "berlin-node", lat: 52.52, lng: 13.405, title: "Berlin Node", detail: "Derivatives hedge", wallet: "0x99ea...228f" },
];

export default function MapSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(contentRef.current?.children || [], {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(mapRef.current, {
        y: 50,
        opacity: 0,
        duration: 1,
        delay: 0.3,
        ease: "power3.out",
        scrollTrigger: {
          trigger: mapRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative overflow-hidden bg-[var(--bg-secondary)] px-4 py-20 sm:px-8 lg:px-12"
    >
      <div ref={contentRef} className="mx-auto max-w-6xl text-center mb-12">
        <p className="font-sans text-xs uppercase tracking-[0.4em] text-[var(--text-secondary)]">
          Global Transaction Lanes
        </p>
        <h2 className="mt-4 font-sans text-3xl font-medium leading-tight tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
          Live wallet route intelligence
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-sans text-base text-[var(--text-secondary)]">
          Hover a pin to inspect wallet clusters, corridor type, and flow amount across 14+ chains.
        </p>
      </div>

      <div ref={mapRef} className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl">
          <WorldMap
            dots={walletFlows}
            pins={mapPins}
            className="aspect-[16/9]"
          />
        </div>
      </div>
    </section>
  );
}
