"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: "dot" | "ring" | "plus" | "square";
  rotation: number;
  rotationSpeed: number;
}

const COLORS = [
  "rgba(26, 115, 232, 0.3)",
  "rgba(26, 115, 232, 0.18)",
  "rgba(26, 115, 232, 0.12)",
  "rgba(236, 72, 153, 0.25)",
  "rgba(236, 72, 153, 0.15)",
];

const TYPES: Particle["type"][] = ["dot", "ring", "plus", "square"];
const COUNT = 22;
const MOUSE_RADIUS = 130;
const MAX_SPEED = 5;

function makeParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radius: 5 + Math.random() * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    type: TYPES[Math.floor(Math.random() * TYPES.length)],
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 1.5;

  switch (p.type) {
    case "dot":
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "ring":
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case "plus":
      const s = p.radius;
      ctx.beginPath();
      ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
      ctx.moveTo(0, -s); ctx.lineTo(0, s);
      ctx.stroke();
      break;

    case "square":
      const half = p.radius * 0.8;
      ctx.strokeRect(-half, -half, half * 2, half * 2);
      break;
  }

  ctx.restore();
}

export default function FleeingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -999, y: -999 });
  const particles = useRef<Particle[]>([]);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particles.current = Array.from({ length: COUNT }, () =>
      makeParticle(window.innerWidth, window.innerHeight)
    );

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);

    // Touch support
    const onTouch = (e: TouchEvent) => {
      mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    window.addEventListener("touchmove", onTouch, { passive: true });

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles.current) {
        // Mouse repulsion
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) ** 1.5;
          p.vx += (dx / dist) * force * 1.2;
          p.vy += (dy / dist) * force * 1.2;
        }

        // Damping — slow return to gentle drift
        p.vx *= 0.95;
        p.vy *= 0.95;

        // Gentle natural drift
        p.vx += (Math.random() - 0.5) * 0.03;
        p.vy += (Math.random() - 0.5) * 0.03;

        // Speed cap
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > MAX_SPEED) {
          p.vx = (p.vx / spd) * MAX_SPEED;
          p.vy = (p.vy / spd) * MAX_SPEED;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wrap edges
        const pad = 30;
        if (p.x < -pad)               p.x = canvas.width  + pad;
        if (p.x > canvas.width  + pad) p.x = -pad;
        if (p.y < -pad)               p.y = canvas.height + pad;
        if (p.y > canvas.height + pad) p.y = -pad;

        drawParticle(ctx, p);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
