"use client";

import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  fillColor: string;
  type: "ring" | "triangle" | "square" | "diamond" | "hex";
  size: "large" | "medium" | "small";
  points: number;
  dying: boolean;
  dyingProgress: number; // 0 → 1
}

interface Laser {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number; // 1 → 0
}

interface Explosion {
  x: number;
  y: number;
  maxRadius: number;
  progress: number; // 0 → 1
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number; // 1 → 0
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const MAX_ASTEROIDS   = 22;
const SPAWN_MS_BASE   = 2000;
const SPAWN_MS_MIN    = 600;
const WAVE_DURATION   = 20_000; // ms
const EXPLOSION_R     = 72;
const EXPLOSION_FRAMES = 24;
const LASER_FRAMES    = 14;
const DIE_FRAMES      = 22;
const STAR_COUNT      = 55;

const COLORS = [
  { stroke: "rgba(26,115,232,0.85)",  fill: "rgba(26,115,232,0.14)"  },
  { stroke: "rgba(99,102,241,0.85)",  fill: "rgba(99,102,241,0.14)"  },
  { stroke: "rgba(139,92,246,0.85)",  fill: "rgba(139,92,246,0.14)"  },
  { stroke: "rgba(236,72,153,0.85)",  fill: "rgba(236,72,153,0.14)"  },
  { stroke: "rgba(20,184,166,0.85)",  fill: "rgba(20,184,166,0.14)"  },
];

const TYPES: Asteroid["type"][] = ["ring", "triangle", "square", "diamond", "hex"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

let _id = 0;

function spawnAsteroid(w: number, h: number, wave: number): Asteroid {
  const c    = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = Math.random() < 0.25 ? "large" : Math.random() < 0.5 ? "medium" : "small";
  const radius =
    size === "large"  ? rand(28, 40) :
    size === "medium" ? rand(17, 27) : rand(9, 16);
  const points =
    size === "large" ? 3 : size === "medium" ? 2 : 1;

  // Spawn from a random screen edge
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;
  if      (edge === 0) { x = rand(0, w); y = -radius - 5; }
  else if (edge === 1) { x = w + radius + 5; y = rand(0, h); }
  else if (edge === 2) { x = rand(0, w); y = h + radius + 5; }
  else                 { x = -radius - 5; y = rand(0, h); }

  // Drift toward center with slight randomness
  const tx   = w / 2 + rand(-120, 120);
  const ty   = h / 2 + rand(-120, 120);
  const dx   = tx - x;
  const dy   = ty - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const spd  = rand(0.55, 1.1) + wave * 0.07;

  return {
    id: _id++,
    x, y,
    vx: (dx / dist) * spd,
    vy: (dy / dist) * spd,
    radius,
    rotation: rand(0, Math.PI * 2),
    rotationSpeed: rand(-0.03, 0.03),
    color: c.stroke,
    fillColor: c.fill,
    type: TYPES[Math.floor(Math.random() * TYPES.length)],
    size, points,
    dying: false, dyingProgress: 0,
  };
}

function splitAsteroid(a: Asteroid): Asteroid[] {
  if (a.size !== "large") return [];
  const angle = rand(0, Math.PI * 2);
  return [0, 1].map((i) => {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    const dir = i === 0 ? 1 : -1;
    return {
      id: _id++,
      x: a.x + Math.cos(angle) * 16 * dir,
      y: a.y + Math.sin(angle) * 16 * dir,
      vx: Math.cos(angle) * rand(0.8, 1.6) * dir + a.vx * 0.4,
      vy: Math.sin(angle) * rand(0.8, 1.6) * dir + a.vy * 0.4,
      radius: rand(16, 25),
      rotation: rand(0, Math.PI * 2),
      rotationSpeed: rand(-0.045, 0.045),
      color: c.stroke, fillColor: c.fill,
      type: TYPES[Math.floor(Math.random() * TYPES.length)],
      size: "medium" as const,
      points: 2,
      dying: false, dyingProgress: 0,
    };
  });
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rotation);
  ctx.strokeStyle = a.color;
  ctx.fillStyle   = a.fillColor;
  ctx.lineWidth   = 2;
  const r = a.radius;

  ctx.beginPath();
  switch (a.type) {
    case "ring":
      ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2); ctx.stroke();
      break;
    case "triangle":
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.87, r * 0.5);
      ctx.lineTo(-r * 0.87, r * 0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case "square":
      ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6); ctx.fill(); ctx.stroke();
      break;
    case "diamond":
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r);  ctx.lineTo(-r * 0.7, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case "hex":
      for (let i = 0; i < 6; i++) {
        const a2 = (i / 6) * Math.PI * 2;
        i === 0
          ? ctx.moveTo(Math.cos(a2) * r, Math.sin(a2) * r)
          : ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
  }
  ctx.restore();
}

function drawDeathBurst(ctx: CanvasRenderingContext2D, a: Asteroid) {
  const t     = a.dyingProgress;
  const alpha = (1 - t) * 0.9;
  const r     = a.radius * (1 + t * 3.2);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(a.x, a.y);
  ctx.strokeStyle = a.color;
  ctx.lineWidth   = 2.5;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  const lines = a.size === "large" ? 10 : 7;
  for (let i = 0; i < lines; i++) {
    const angle = (i / lines) * Math.PI * 2;
    const inner = a.radius * (0.2 + t * 0.6);
    const outer = a.radius * (1.0 + t * 2.8);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FleeingParticles({ onIntroDone }: { onIntroDone?: () => void } = {}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const mouseRef     = useRef({ x: -999, y: -999 });
  const asteroids    = useRef<Asteroid[]>([]);
  const toSpawn      = useRef<Asteroid[]>([]);
  const lasers       = useRef<Laser[]>([]);
  const explosions   = useRef<Explosion[]>([]);
  const floatTexts   = useRef<FloatingText[]>([]);
  const stars        = useRef<Star[]>([]);
  const rafRef       = useRef<number>(0);
  const frameRef     = useRef(0);
  const lastSpawnRef = useRef(0);
  const waveStartRef = useRef(0);
  const scoreRef     = useRef(0);
  const waveRef      = useRef(1);
  const comboRef     = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [score, setScore]       = useState(0);
  const [best,  setBest]        = useState(0);
  const [wave,  setWave]        = useState(1);
  const [combo, setCombo]       = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem("heidi-shooter-best") || "0", 10);
    setBest(saved);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const initStars = () => {
      stars.current = Array.from({ length: STAR_COUNT }, () => ({
        x: rand(0, canvas.width),
        y: rand(0, canvas.height),
        r: rand(0.6, 2.2),
        phase: rand(0, Math.PI * 2),
      }));
    };

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };
    resize();
    window.addEventListener("resize", resize);

    // Seed initial asteroids
    for (let i = 0; i < 8; i++) {
      asteroids.current.push(spawnAsteroid(canvas.width, canvas.height, 1));
    }

    const now = Date.now();
    lastSpawnRef.current = now;
    waveStartRef.current = now;

    // ── Mouse ──
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);

    // ── Click to shoot ──
    const fire = (cx: number, cy: number) => {
      // Laser beam
      lasers.current.push({
        fromX: canvas.width / 2,
        fromY: canvas.height - 18,
        toX: cx, toY: cy,
        life: 1,
      });

      // Explosion ring (visual only)
      explosions.current.push({
        x: cx, y: cy,
        maxRadius: EXPLOSION_R,
        progress: 0,
      });

      // Immediate hit detection
      const fragments: Asteroid[] = [];
      for (const a of asteroids.current) {
        if (a.dying) continue;
        const dx = a.x - cx;
        const dy = a.y - cy;
        if (Math.sqrt(dx * dx + dy * dy) < EXPLOSION_R + a.radius * 0.55) {
          a.dying = true;
          a.dyingProgress = 0;

          // Combo
          comboRef.current += 1;
          setCombo(comboRef.current);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          comboTimerRef.current = setTimeout(() => {
            comboRef.current = 0;
            setCombo(0);
          }, 1500);

          const pts = a.points * Math.max(1, comboRef.current);
          scoreRef.current += pts;
          setScore(scoreRef.current);

          setBest(prev => {
            const next = Math.max(prev, scoreRef.current);
            localStorage.setItem("heidi-shooter-best", String(next));
            return next;
          });

          floatTexts.current.push({
            x: a.x, y: a.y - a.radius - 4,
            text: `+${pts}`,
            life: 1,
          });

          if (a.size === "large") {
            fragments.push(...splitAsteroid(a));
          }
        }
      }
      toSpawn.current.push(...fragments);
    };

    const onClick = (e: MouseEvent) => fire(e.clientX, e.clientY);
    canvas.addEventListener("click", onClick);

    const onTouch = (e: TouchEvent) => {
      mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      fire(t.clientX, t.clientY);
    };
    window.addEventListener("touchmove",  onTouch,    { passive: true });
    window.addEventListener("touchend",   onTouchEnd, { passive: true });

    // ── Tick ──────────────────────────────────────────────────────────────────
    const tick = () => {
      const now2 = Date.now();
      frameRef.current++;
      const f = frameRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Wave timer ──
      if (now2 - waveStartRef.current > WAVE_DURATION) {
        waveRef.current++;
        setWave(waveRef.current);
        waveStartRef.current = now2;
      }

      // ── Spawn ──
      const spawnMs = Math.max(SPAWN_MS_MIN, SPAWN_MS_BASE - waveRef.current * 130);
      if (
        now2 - lastSpawnRef.current > spawnMs &&
        asteroids.current.filter(a => !a.dying).length < MAX_ASTEROIDS + waveRef.current
      ) {
        asteroids.current.push(spawnAsteroid(canvas.width, canvas.height, waveRef.current));
        lastSpawnRef.current = now2;
      }

      // Flush split fragments
      if (toSpawn.current.length > 0) {
        asteroids.current.push(...toSpawn.current);
        toSpawn.current = [];
      }

      // ── Stars ──
      for (const s of stars.current) {
        const twinkle = 0.25 + 0.45 * Math.abs(Math.sin(s.phase + f * 0.018));
        ctx.save();
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = "#1a73e8";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Lasers ──
      for (const l of lasers.current) {
        const grad = ctx.createLinearGradient(l.fromX, l.fromY, l.toX, l.toY);
        grad.addColorStop(0,   "rgba(26,115,232,0)");
        grad.addColorStop(0.3, "rgba(26,115,232,0.55)");
        grad.addColorStop(0.85,"rgba(99,179,255,0.9)");
        grad.addColorStop(1,   "rgba(255,255,255,1)");
        ctx.save();
        ctx.globalAlpha = l.life;
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 2.5;
        ctx.shadowBlur  = 14;
        ctx.shadowColor = "#1a73e8";
        ctx.beginPath();
        ctx.moveTo(l.fromX, l.fromY);
        ctx.lineTo(l.toX, l.toY);
        ctx.stroke();
        ctx.restore();
        l.life -= 1 / LASER_FRAMES;
      }
      lasers.current = lasers.current.filter(l => l.life > 0);

      // ── Explosions ──
      for (const ex of explosions.current) {
        ex.progress += 1 / EXPLOSION_FRAMES;
        const r     = ex.maxRadius * ex.progress;
        const alpha = (1 - ex.progress) * 0.75;

        ctx.save();
        // Outer ring
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#1a73e8";
        ctx.lineWidth   = 2.5;
        ctx.shadowBlur  = 18;
        ctx.shadowColor = "#1a73e8";
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow fill
        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha * 0.12;
        ctx.fillStyle = "#1a73e8";
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      explosions.current = explosions.current.filter(ex => ex.progress < 1);

      // ── Asteroids ──
      const kept: Asteroid[] = [];
      for (const a of asteroids.current) {
        if (a.dying) {
          drawDeathBurst(ctx, a);
          a.dyingProgress += 1 / DIE_FRAMES;
          if (a.dyingProgress < 1) kept.push(a);
          continue;
        }

        a.x += a.vx;
        a.y += a.vy;
        a.rotation += a.rotationSpeed;

        // Remove if escaped off-screen
        const pad = 80;
        if (
          a.x < -pad || a.x > canvas.width + pad ||
          a.y < -pad || a.y > canvas.height + pad
        ) continue;

        // Highlight near cursor
        const dx   = a.x - mouseRef.current.x;
        const dy   = a.y - mouseRef.current.y;
        const near = Math.sqrt(dx * dx + dy * dy) < EXPLOSION_R + a.radius;
        drawAsteroid(ctx, a, near ? 1 : 0.72);
        kept.push(a);
      }
      asteroids.current = kept;

      // ── Floating score texts ──
      floatTexts.current = floatTexts.current.filter(ft => ft.life > 0);
      for (const ft of floatTexts.current) {
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.font = "bold 16px Inter, sans-serif";
        ctx.fillStyle   = "#1a73e8";
        ctx.textAlign   = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        ft.y    -= 1.4;
        ft.life -= 0.026;
      }

      // ── Ship at bottom center ──
      const sx = canvas.width / 2;
      const sy = canvas.height - 10;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle   = "#1a73e8";
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(sx,      sy - 14);
      ctx.lineTo(sx + 9,  sy + 6);
      ctx.lineTo(sx,      sy + 2);
      ctx.lineTo(sx - 9,  sy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Engine glow flicker
      const flicker = 0.5 + 0.5 * Math.sin(f * 0.4);
      ctx.globalAlpha = 0.25 + flicker * 0.35;
      ctx.fillStyle   = "rgba(26,115,232,0.6)";
      ctx.beginPath();
      ctx.ellipse(sx, sy + 10, 5, 4 + flicker * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Crosshair cursor ──
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      if (mx > 0) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = "#1a73e8";
        ctx.lineWidth   = 1.5;

        const cs = 11;
        const gap = 4;
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(mx - cs - gap, my); ctx.lineTo(mx - gap, my);
        ctx.moveTo(mx + gap, my);      ctx.lineTo(mx + cs + gap, my);
        // Vertical lines
        ctx.moveTo(mx, my - cs - gap); ctx.lineTo(mx, my - gap);
        ctx.moveTo(mx, my + gap);      ctx.lineTo(mx, my + cs + gap);
        ctx.stroke();

        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(mx, my, gap + 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize",    resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend",  onTouchEnd);
      canvas.removeEventListener("click", onClick);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* ── Cloud background — fixed blobs that drift slowly behind the game ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        {/* Top-left — blue */}
        <div style={{
          position: "absolute", top: "-10%", left: "-8%",
          width: 520, height: 420,
          borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
          background: "radial-gradient(ellipse at 40% 40%, #93c5fd 0%, #60a5fa 35%, #3b82f6 65%, transparent 100%)",
          filter: "blur(64px)",
          opacity: 0.35,
          animation: "cloudDrift1 18s ease-in-out infinite",
        }} />
        {/* Top-right — pink */}
        <div style={{
          position: "absolute", top: "-5%", right: "-10%",
          width: 480, height: 400,
          borderRadius: "45% 55% 40% 60% / 55% 45% 60% 40%",
          background: "radial-gradient(ellipse at 55% 45%, #f9a8d4 0%, #f472b6 40%, #ec4899 70%, transparent 100%)",
          filter: "blur(60px)",
          opacity: 0.3,
          animation: "cloudDrift2 22s ease-in-out infinite",
        }} />
        {/* Center — lavender blend where they meet */}
        <div style={{
          position: "absolute", top: "20%", left: "30%",
          width: 560, height: 360,
          borderRadius: "50% 50% 45% 55% / 45% 55% 50% 50%",
          background: "radial-gradient(ellipse at 50% 50%, #e9d5ff 0%, #c4b5fd 40%, #a78bfa 70%, transparent 100%)",
          filter: "blur(80px)",
          opacity: 0.22,
          animation: "cloudDrift3 26s ease-in-out infinite",
        }} />
        {/* Bottom-left — pink accent */}
        <div style={{
          position: "absolute", bottom: "-12%", left: "5%",
          width: 400, height: 350,
          borderRadius: "55% 45% 50% 50% / 40% 60% 45% 55%",
          background: "radial-gradient(ellipse at 45% 55%, #fbcfe8 0%, #f9a8d4 45%, #ec4899 80%, transparent 100%)",
          filter: "blur(72px)",
          opacity: 0.25,
          animation: "cloudDrift2 20s ease-in-out infinite reverse",
        }} />
        {/* Bottom-right — blue accent */}
        <div style={{
          position: "absolute", bottom: "-8%", right: "0%",
          width: 440, height: 380,
          borderRadius: "40% 60% 55% 45% / 55% 45% 60% 40%",
          background: "radial-gradient(ellipse at 55% 50%, #bfdbfe 0%, #93c5fd 40%, #3b82f6 75%, transparent 100%)",
          filter: "blur(68px)",
          opacity: 0.28,
          animation: "cloudDrift1 24s ease-in-out infinite reverse",
        }} />
      </div>

      <canvas
        ref={canvasRef}
        className="fixed inset-0"
        style={{ zIndex: 0, pointerEvents: "auto", cursor: "none" }}
      />

      {/* Intro text — appears once, fades in, holds, then splits out */}
      {showIntro && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
          style={{ zIndex: 3 }}
        >
          {/* Soft scrim so text pops against the game */}
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />

          <p
            className="relative select-none text-5xl sm:text-7xl font-bold tracking-tight"
            style={{
              animation: "introSplit 2s cubic-bezier(0.4,0,0.6,1) forwards",
              background: "linear-gradient(135deg, #1a73e8 0%, #8b5cf6 50%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            onAnimationEnd={() => { setShowIntro(false); onIntroDone?.(); }}
          >
            Shoot while you wait
          </p>

          <p
            className="relative select-none text-sm text-[#6B7280] font-medium tracking-wide"
            style={{ animation: "introSubFade 2s cubic-bezier(0.4,0,0.6,1) forwards" }}
          >
            Your lecture is being analyzed
          </p>
        </div>
      )}

      {/* HUD — hidden during intro */}
      {!showIntro && <div
        className="fixed top-4 right-4 flex flex-col items-end gap-1.5 select-none animate-fade-in"
        style={{ zIndex: 2 }}
      >
        {combo > 1 && (
          <div className="animate-fade-in-up bg-[#ec4899] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            {combo}× COMBO!
          </div>
        )}
        <div className="bg-white/85 backdrop-blur border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-right shadow-sm min-w-[108px]">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Score</p>
          <p className="text-xl font-bold text-[#1a73e8] leading-none">{score}</p>
          {best > 0 && (
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Best {best}</p>
          )}
          <div className="mt-1.5 pt-1.5 border-t border-[#F3F4F6] text-[10px] text-[#9CA3AF]">
            Wave {wave}
          </div>
        </div>
        <p className="text-[10px] text-[#9CA3AF]">Click to blast the shapes</p>
      </div>}
    </>
  );
}
