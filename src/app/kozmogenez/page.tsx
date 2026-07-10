"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import Link from 'next/link';
import {
  timelineEvents,
  sliderTToYearsAgo,
  getActiveEvent,
  yearsAgoToSliderT,
  type TimelineEvent,
} from "./timelineData";
import styles from "./kozmogenez.module.css";

function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo > 1_000_000_000) return `${(yearsAgo / 1_000_000_000).toFixed(2)} Milyar Yıl Önce`;
  if (yearsAgo > 1_000_000) return `${(yearsAgo / 1_000_000).toFixed(1)} Milyon Yıl Önce`;
  if (yearsAgo > 1000) return `${Math.round(yearsAgo).toLocaleString("tr-TR")} Yıl Önce`;
  if (yearsAgo < 1) return "ŞİMDİ";
  return `${Math.round(yearsAgo)} Yıl Önce`;
}

/* --- HIGH-END KOZMİK SİMÜLASYON SENSÖRÜ (AstralCanvas) --- */
function AstralCanvas({ t, glowColor }: { t: number; glowColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debrisRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; angle: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLLISION_T = yearsAgoToSliderT(4_533_000_000);
    let raf: number;
    let animTime = 0;

    // Kozmik toz bulutu (Nebula partikülleri)
    const dustClouds = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 80 + 40,
      color: Math.random() > 0.5 ? 'rgba(168, 85, 247, 0.04)' : 'rgba(236, 72, 153, 0.03)',
      speed: Math.random() * 0.2 - 0.1
    }));

    // Yıldızlar
    const stars = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2,
      twinkle: Math.random() * 0.02
    }));

    // Çarpışma parçacıkları (Accretion Disk)
    if (debrisRef.current.length === 0) {
      debrisRef.current = Array.from({ length: 200 }).map(() => {
        const theta = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        return {
          x: 0, y: 0,
          vx: Math.cos(theta) * speed,
          vy: Math.sin(theta) * speed,
          size: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.5 + 0.5,
          angle: Math.random() * Math.PI * 2
        };
      });
    }

    // Atmosferli küre çizim fonksiyonu (Glow Katmanlı)
    const drawCelestialBody = (x: number, y: number, radius: number, primaryColor: string, darkColor: string, glowIntensity = 15) => {
      // 1. Dış Atmosfer Parlaması (Volumetric Glow)
      ctx.globalCompositeOperation = 'screen';
      const glowGrad = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 1.8);
      glowGrad.addColorStop(0, `${primaryColor}44`);
      glowGrad.addColorStop(0.5, `${primaryColor}11`);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // 2. Fiziksel Gövde
      ctx.globalCompositeOperation = 'source-over';
      const bodyGrad = ctx.createRadialGradient(x - radius/2.5, y - radius/2.5, radius * 0.05, x, y, radius);
      bodyGrad.addColorStop(0, primaryColor);
      bodyGrad.addColorStop(0.7, darkColor);
      bodyGrad.addColorStop(1, '#02000a');
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
    };

    const draw = () => {
      animTime += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 100;

      // 1. ADIM: SAKİN ARKA PLAN YILDIZLARI VE KOZMİK TOZLAR
      stars.forEach(s => {
        s.twinkle += 0.02;
        ctx.globalAlpha = 0.3 + Math.abs(Math.sin(s.twinkle)) * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Kozmik Gaz Bulutları (Blended Nebula Dust)
      ctx.globalCompositeOperation = 'screen';
      dustClouds.forEach(d => {
        d.x += Math.sin(animTime * d.speed) * 0.1;
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        grad.addColorStop(0, d.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';

      // 2. ADIM: GEZEGENLERİN SİMÜLASYONU
      if (t < COLLISION_T) {
        // Çarpışma Öncesi Yaklaşma
        const progress = t / COLLISION_T;
        const distance = (canvas.width * 0.22) * (1 - progress);

        // Gaia (Mavi Atmosferli)
        drawCelestialBody(cx + distance, cy, 48, '#22d3ee', '#083344');
        // Theia (Mor/Fuşya Atmosferli)
        drawCelestialBody(cx - distance, cy, 38, '#f472b6', '#4a044e');

      } else {
        // Çarpışma Sonrası (Ay ve Enkaz Bulutu)
        const postT = t - COLLISION_T;
        
        // Birleşmiş Büyük Gaia
        drawCelestialBody(cx, cy, 58, '#22d3ee', '#083344');

        // Ay'ın Yörünge Fiziği
        const orbitAngle = animTime * 0.8;
        const moonRadius = 130;
        const targetMoonX = cx + Math.cos(orbitAngle) * moonRadius;
        const targetMoonY = cy + Math.sin(orbitAngle) * moonRadius;

        if (postT < 0.12) {
          // YERÇEKİMSEL BİRLEŞME (Accretion Disk Simülasyonu)
          const particleProgress = postT / 0.12; // 0'dan 1'e doğru

          debrisRef.current.forEach((d, index) => {
            // Parçacıklar spiral çizerek Ay yörüngesinde toplanıyor
            d.angle += 0.05 + (index % 5) * 0.002;
            const currentOrbitRadius = (moonRadius * 2) * (1 - particleProgress) + moonRadius * particleProgress;
            
            const startX = cx + Math.cos(d.angle) * currentOrbitRadius + d.vx * (1 - particleProgress) * 4;
            const startY = cy + Math.sin(d.angle) * currentOrbitRadius + d.vy * (1 - particleProgress) * 4;

            // Ay'ın çekim merkezine yaklaştıkça parçacıklar birleşir
            const finalX = startX + (targetMoonX - startX) * Math.pow(particleProgress, 2);
            const finalY = startY + (targetMoonY - startY) * Math.pow(particleProgress, 2);

            ctx.fillStyle = `rgba(244, 114, 182, ${d.alpha * (1 - particleProgress * 0.8)})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, d.size, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {
          // Ay tamamen oluştu ve parlıyor
          drawCelestialBody(targetMoonX, targetMoonY, 15, '#cbd5e1', '#374151');
        }

        // Theia'nın kalan Astral Toz Bulutu (Volumetric Ring)
        ctx.globalCompositeOperation = 'screen';
        const nebulaGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, 180 + Math.sin(animTime) * 10);
        nebulaGrad.addColorStop(0, 'rgba(168, 85, 247, 0.08)');
        nebulaGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.04)');
        nebulaGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, 200, 0, Math.PI * 2);
        ctx.fillStyle = nebulaGrad;
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      // ÇARPIŞMA ANI SİNEMATİK PARLAMA (Kör Edici Işık)
      const distToCollision = Math.abs(t - COLLISION_T);
      if (distToCollision < 0.03) {
        const flashAlpha = Math.pow(1 - (distToCollision / 0.03), 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [t, glowColor]);

  return <canvas ref={canvasRef} className={styles.astralCanvas} />;
}

/* --- REWIND SESİ --- */
function useRewindTone() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const play = useCallback((intensity: number) => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    const baseFreq = 220;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, baseFreq - intensity * 160), ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }, []);
  return play;
}

/* --- SİNEMATİK PANEL (KUTUSUZ & TEPEDEN KAYAN) --- */
function MemoryPanel({ event }: { event: TimelineEvent }) {
  return (
    <motion.div
      key={event.id}
      className={`${styles.memoryPanel} w-full max-w-2xl mx-auto text-center`}
      // En tepeden (-50px) aşağıya doğru kayarak ve opaklaşarak gelme efekti
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30, filter: "blur(4px)" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className={styles.panelEra}>{event.era}</span>
      <h3 className={styles.panelTitle} style={{ textShadow: `0 0 15px ${event.colorTheme.glow}` }}>
        {event.title}
      </h3>
      <p className={styles.panelNarrative}>{event.narrative}</p>
      
      {/* Çizgi Roman Görseli (Eğer varsa yine altında zarifçe belirir) */}
      {event.gorsel_url && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 border border-white/10 overflow-hidden rounded relative aspect-[21/9] w-full max-w-xl mx-auto bg-black/40 shadow-2xl"
        >
          <img src={event.gorsel_url} alt={event.title} className="w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
        </motion.div>
      )}

      {event.panel && <p className={`${styles.panelCaption} mt-2`}>{event.panel.caption}</p>}
    </motion.div>
  );
}

/* --- ANA MODÜL --- */
export default function KozmogenezModule() {
  const t = useMotionValue(0); 
  const [tDisplay, setTDisplay] = useState(0);
  const [isRewinding, setIsRewinding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // Default 1x
  const lastTRef = useRef(0);
  const playRewindTone = useRewindTone();
  const rewindTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const bgOpacity = useTransform(t, [0, 1], [0.9, 0.6]);

  useEffect(() => {
    const unsub = t.on("change", (latest) => {
      const delta = latest - lastTRef.current;
      
      if (delta < -0.001) {
        setIsRewinding(true);
        playRewindTone(Math.min(1, Math.abs(delta) * 40));
      }
      if (rewindTimeoutRef.current) clearTimeout(rewindTimeoutRef.current);
      rewindTimeoutRef.current = setTimeout(() => setIsRewinding(false), 150);

      lastTRef.current = latest;
      setTDisplay(latest);
    });
    return () => unsub();
  }, [t, playRewindTone]);

  // Otomatik Oynatma (Play) Döngüsü
  useEffect(() => {
    if (isPlaying) {
      const step = 0.0015 * playSpeed;
      playIntervalRef.current = setInterval(() => {
        const nextT = t.get() + step;
        if (nextT >= 1) {
          t.set(1);
          setIsPlaying(false);
        } else {
          t.set(nextT);
        }
      }, 16); // ~60fps
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, playSpeed]);

  const handleWheel = (e: React.WheelEvent) => {
    setIsPlaying(false); // Manuel müdahalede otomatik oynatmayı durdur
    const step = e.deltaY > 0 ? 0.015 : -0.015;
    const nextT = Math.max(0, Math.min(1, t.get() + step));
    animate(t, nextT, { duration: 0.15, ease: "linear" });
  };

  const handleDotClick = (yearsAgo: number) => {
    setIsPlaying(false);
    const targetT = yearsAgoToSliderT(yearsAgo);
    animate(t, targetT, { duration: 1.2, ease: "easeInOut" });
  };

  const yearsAgo = sliderTToYearsAgo(tDisplay);
  const activeEvent = useMemo(() => getActiveEvent(tDisplay), [tDisplay]);

  const handleSlide = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    const val = Number(e.target.value) / 1000;
    animate(t, val, { duration: 0.15, ease: "linear" });
  };

  return (
    <div
      onWheel={handleWheel}
      className={`${styles.wrapper} ${isRewinding ? styles.rewindGlitch : ""}`}
      style={{ ["--theme-primary" as any]: activeEvent.colorTheme.primary, ["--theme-glow" as any]: activeEvent.colorTheme.glow }}
    >
      <AstralCanvas t={tDisplay} glowColor={activeEvent.colorTheme.glow} />

      {/* ÜSTE ALINAN İÇERİK ALANI */}
      <div className="relative z-10 flex flex-col justify-start items-center h-screen pt-12 pb-24 px-6 overflow-hidden">
        
        <motion.div style={{ opacity: bgOpacity }} className={`${styles.eraLabel} mb-4`}>
          {activeEvent.era}
        </motion.div>

        <AnimatePresence mode="wait">
          <MemoryPanel event={activeEvent} />
        </AnimatePresence>

        <AnimatePresence>
          {activeEvent.id === "present" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-40 z-20"
            >
              <Link href="/portal" className="border border-fuchsia-500/50 bg-black/80 text-fuchsia-300 px-8 py-3 tracking-[0.3em] uppercase text-xs hover:bg-fuchsia-500/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all">
                Uyanış — Portal'a Dön
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KONTROL ALANI */}
        <div className={`${styles.chronometer} mt-auto w-full max-w-2xl`}>
          <div className="flex items-center justify-between w-full mb-1">
            <span className={styles.yearsReadout}>{formatYearsAgo(yearsAgo)}</span>
            
            {/* PLAY / PAUSE VE HIZ AYARI */}
            <div className="flex items-center gap-3 bg-black/60 border border-white/5 px-3 py-1 rounded-full">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:text-fuchsia-400 text-xs tracking-wider uppercase transition-colors"
              >
                {isPlaying ? "⏸ Duraklat" : "▶ Oynat"}
              </button>
              <div className="h-3 w-px bg-white/10" />
              {([0.5, 1, 2, 4, 8] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaySpeed(speed)}
                  className={`text-[9px] font-mono transition-colors ${playSpeed === speed ? 'text-fuchsia-400 font-bold' : 'text-white/40 hover:text-white/80'}`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={1000}
            value={tDisplay * 1000}
            onChange={handleSlide}
            className={styles.scrubBar}
            aria-label="Kozmik Kronometre"
          />

          <div className={styles.milestoneMarks}>
            {timelineEvents.map((ev) => {
              const dotT = yearsAgoToSliderT(ev.yearsAgo);
              return (
                <button
                  key={ev.id}
                  onClick={() => handleDotClick(ev.yearsAgo)}
                  className={styles.markDot}
                  style={{ 
                    left: `${dotT * 100}%`,
                    cursor: 'pointer',
                    transform: 'translate(-50%, 0)',
                    height: '10px', width: '6px', 
                    backgroundColor: tDisplay >= dotT ? activeEvent.colorTheme.glow : 'rgba(255,255,255,0.2)'
                  }}
                  title={ev.title}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}