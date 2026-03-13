"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";

const SLIDE_DURATION = 5000;

interface SlideProps {
  isActive: boolean;
  isPaused: boolean;
}

function DashboardOverview({ isActive, isPaused }: SlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!isActive || isPaused) return;

    const ctx = gsap.context(() => {
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        gsap.fromTo(bar, 
          { height: "20%" },
          { 
            height: `${30 + Math.random() * 60}%`, 
            duration: 0.8 + Math.random() * 0.4, 
            ease: "power2.out",
            delay: i * 0.15,
            yoyo: true,
            repeat: -1
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [isActive, isPaused]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg bg-[#0f0f0f] p-3">
      <div className="flex h-full gap-2">
        <div className="w-36 shrink-0 rounded bg-[#1a1a1a] p-2">
          <div className="mb-2 h-2 w-12 rounded bg-[#2a2a2a]" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="mb-1.5 flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-[#2a2a2a]" />
              <div className="h-1.5 w-14 rounded bg-[#1f1f1f]" />
            </div>
          ))}
        </div>
        <div className="flex-1 rounded bg-[#1a1a1a] p-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-2 w-16 rounded bg-[#2a2a2a]" />
            <div className="flex gap-0.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-2 w-2 rounded-full bg-[#3a3a3a]" />
              ))}
            </div>
          </div>
          <div className="flex h-24 items-end justify-between gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                ref={(el) => { if (el) barsRef.current[i] = el; }}
                className="flex-1 rounded-t bg-gradient-to-t from-[#3a3a3a] to-[#2a2a2a]"
              />
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded bg-[#1f1f1f]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageReviewSlide({ isActive, isPaused }: SlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!isActive || isPaused) return;

    const ctx = gsap.context(() => {
      commentsRef.current.forEach((comment, i) => {
        if (!comment) return;
        gsap.fromTo(comment,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.5, delay: 1 + i * 0.8, ease: "power2.out" }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [isActive, isPaused]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg bg-[#0f0f0f] p-3">
      <div className="flex h-full gap-2">
        <div className="flex-1 rounded bg-[#1a1a1a] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <svg className="h-12 w-12 text-[#555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          </div>
        </div>
        <div className="w-44 shrink-0 rounded bg-[#1a1a1a] p-2">
          <div className="mb-2 h-2 w-14 rounded bg-[#2a2a2a]" />
          {[
            { avatar: "A", name: "Alex", text: "Looking great!", time: "2m" },
            { avatar: "S", name: "Sarah", text: "Love the new layout", time: "5m" },
            { avatar: "M", name: "Mike", text: "Approved", time: "12m" }
          ].map((comment, i) => (
            <div
              key={i}
              ref={(el) => { if (el) commentsRef.current[i] = el; }}
              className="mb-1.5 rounded bg-[#151515] p-1.5 opacity-0"
            >
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2a2a2a] text-[9px] text-[#666]">
                  {comment.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#555]">{comment.name}</span>
                    <span className="text-[9px] text-[#444]">{comment.time}</span>
                  </div>
                  <p className="text-[10px] text-[#666]">{comment.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetLibrarySlide({ isActive, isPaused }: SlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || isPaused) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(gridRef.current?.children || [],
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.2)" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isActive, isPaused]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg bg-[#0f0f0f] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="h-2 w-16 rounded bg-[#2a2a2a]" />
        <div className="flex gap-1">
          <div className="h-4 w-4 rounded bg-[#1a1a1a]" />
          <div className="h-4 w-4 rounded bg-[#252525]" />
        </div>
      </div>
      <div ref={gridRef} className="grid h-[calc(100%-20px)] grid-cols-4 gap-1.5">
        {[
          { icon: "📊" },
          { icon: "🎨" },
          { icon: "📁" },
          { icon: "🖼" },
          { icon: "📈" },
          { icon: "🎯" },
          { icon: "💎" },
          { icon: "🔮" },
        ].map((item, i) => (
          <div
            key={i}
            className="group relative flex items-center justify-center rounded border border-[#1a1a1a] bg-[#151515] transition-transform hover:scale-105"
            style={{ aspectRatio: "1" }}
          >
            <span className="text-base opacity-40">{item.icon}</span>
            <div className="absolute inset-0 rounded bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamCollabSlide({ isActive, isPaused }: SlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!isActive || isPaused) return;

    const ctx = gsap.context(() => {
      membersRef.current.forEach((member, i) => {
        if (!member) return;
        gsap.fromTo(member,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, delay: 0.5 + i * 0.3, ease: "power2.out" }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [isActive, isPaused]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg bg-[#0f0f0f] p-3">
      <div className="flex h-full gap-2">
        <div className="flex-1 rounded bg-[#1a1a1a] p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-2 w-14 rounded bg-[#2a2a2a]" />
            <div className="flex -space-x-1.5">
              {["A", "B", "C", "+2"].map((item, i) => (
                <div
                  key={i}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#2a2a2a] text-[9px] text-[#555]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { title: "Q4 Roadmap Review", status: "In Progress" },
              { title: "Design System v2", status: "Completed" },
              { title: "API Integration", status: "Review" },
            ].map((task, i) => (
              <div key={i} className="flex items-center gap-2 rounded bg-[#151515] p-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#3a3a3a]" />
                <div className="flex-1">
                  <div className="h-1.5 w-24 rounded bg-[#1f1f1f]" />
                </div>
                <div className="h-1.5 w-10 rounded bg-[#1f1f1f]" />
              </div>
            ))}
          </div>
        </div>
        <div className="w-32 shrink-0 rounded bg-[#1a1a1a] p-2">
          <div className="mb-2 h-2 w-12 rounded bg-[#2a2a2a]" />
          {[
            { name: "Alex Chen", role: "Designer" },
            { name: "Sarah Kim", role: "Developer" },
            { name: "Mike Ross", role: "PM" },
          ].map((member, i) => (
            <div
              key={i}
              ref={(el) => { if (el) membersRef.current[i] = el; }}
              className="mb-1.5 flex items-center gap-2 opacity-0"
            >
              <div className="h-6 w-6 rounded-full bg-[#252525]" />
              <div>
                <div className="h-1.5 w-12 rounded bg-[#1f1f1f]" />
                <div className="mt-1 h-1 w-8 rounded bg-[#1a1a1a]" />
              </div>
            </div>
          ))}
          <div className="mt-3 rounded bg-[#151515] p-1.5">
            <div className="h-1 w-full rounded bg-[#1f1f1f]" />
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#3a3a3a]" />
              <span className="text-[10px] text-[#555]">3 online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsSlide({ isActive, isPaused }: SlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const numbersRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!isActive || isPaused) return;

    const ctx = gsap.context(() => {
      numbersRef.current.forEach((num, i) => {
        if (!num) return;
        const target = parseInt(num.textContent || "0");
        gsap.fromTo(num,
          { textContent: 0 },
          { 
            textContent: target, 
            duration: 2, 
            delay: i * 0.3,
            snap: { textContent: 1 },
            ease: "power1.out"
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [isActive, isPaused]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg bg-[#0f0f0f] p-3">
      <div className="mb-3 flex gap-2">
        {[
          { label: "Total Users", value: "12453", change: "+12%" },
          { label: "Revenue", value: "$8432", change: "+8%" },
          { label: "Active Now", value: "892", change: "+23%" },
        ].map((stat, i) => (
          <div
            key={i}
            ref={(el) => { if (el) numbersRef.current[i] = el; }}
            className="flex-1 rounded bg-[#1a1a1a] p-2"
          >
            <div className="mb-1 h-1.5 w-12 rounded bg-[#2a2a2a]" />
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-medium text-[#fff]">{stat.value}</span>
              <span className="text-[10px] text-[#555]">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex h-24 gap-2">
        <div className="flex-1 rounded bg-[#1a1a1a] p-2">
          <div className="mb-1.5 h-1.5 w-14 rounded bg-[#2a2a2a]" />
          <div className="flex h-full items-end justify-between gap-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-[#3a3a3a] to-[#2a2a2a]"
                style={{ height: `${20 + Math.random() * 70}%` }}
              />
            ))}
          </div>
        </div>
        <div className="w-24 shrink-0 rounded bg-[#1a1a1a] p-2">
          <div className="mb-1.5 h-1.5 w-10 rounded bg-[#2a2a2a]" />
          <div className="flex items-center justify-center">
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#1a1a1a" strokeWidth="4" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="#3a3a3a" strokeWidth="4" strokeDasharray="140" strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">72%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const slides = [
  { id: 1, title: "Dashboard Overview", component: DashboardOverview },
  { id: 2, title: "Image Review", component: ImageReviewSlide },
  { id: 3, title: "Asset Library", component: AssetLibrarySlide },
  { id: 4, title: "Team Collaboration", component: TeamCollabSlide },
  { id: 5, title: "Analytics", component: AnalyticsSlide },
];

export default function DashboardCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef({ x: 0, y: 0 });

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setProgress(0);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  }, [currentSlide, goToSlide]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + (100 / (SLIDE_DURATION / 16));
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    tiltRef.current = { x: y * 8, y: -x * 8 };
  };

  const handleMouseLeave = () => {
    tiltRef.current = { x: 0, y: 0 };
  };

  return (
    <div 
      ref={containerRef}
      className="relative mx-auto max-w-3xl"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <motion.div
        animate={{
          rotateX: tiltRef.current.x,
          rotateY: tiltRef.current.y,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] shadow-2xl"
      >
        <div className="relative h-full">
          <div className="flex items-center gap-1.5 border-b border-[#1a1a1a] bg-[#0f0f0f] px-3 py-1.5">
            <div className="flex gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-[#2a2a2a]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#2a2a2a]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#2a2a2a]" />
            </div>
            <div className="ml-2 flex-1 rounded bg-[#0a0a0a] px-2 py-0.5">
              <span className="text-[10px] text-[#444]">kryptos.app/dashboard</span>
            </div>
          </div>

          <div className="relative h-[calc(100%-28px)] overflow-hidden px-2 pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="h-full"
              >
                {(() => {
                  const SlideComponent = slides[currentSlide].component;
                  return <SlideComponent isActive={true} isPaused={isPaused} />;
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className="group relative h-1.5 w-6 rounded-full bg-[#1a1a1a] transition-colors hover:bg-[#2a2a2a]"
                >
                  {i === currentSlide && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-[#666]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={prevSlide}
            className="absolute left-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a]/60 text-[#444] opacity-0 transition-opacity hover:bg-[#252525] hover:text-[#fff] group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a]/60 text-[#444] opacity-0 transition-opacity hover:bg-[#252525] hover:text-[#fff] group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
