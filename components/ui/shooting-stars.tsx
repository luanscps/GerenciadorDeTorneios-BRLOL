"use client";
import { useEffect, useRef, useCallback } from "react";

interface Star {
  x: number;
  y: number;
  len: number;
  speed: number;
  size: number;
  opacity: number;
  trail: number;
}

interface ShootingStarsProps {
  minSpeed?: number;
  maxSpeed?: number;
  minDelay?: number;
  maxDelay?: number;
  starColor?: string;
  trailColor?: string;
  starWidth?: number;
  starHeight?: number;
  className?: string;
}

export function ShootingStars({
  minSpeed = 8,
  maxSpeed = 22,
  minDelay = 900,
  maxDelay = 3200,
  starColor = "#C8A84B",
  trailColor = "rgba(200,168,75,0.12)",
  starWidth = 2,
  starHeight = 1,
  className = "",
}: ShootingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const frameRef = useRef<number>(0);
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const spawnStar = useCallback(
    (canvas: HTMLCanvasElement): Star => ({
      x: Math.random() * canvas.width * 0.6,
      y: Math.random() * canvas.height * 0.4,
      len: Math.random() * 80 + 60,
      speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
      size: starWidth,
      opacity: Math.random() * 0.6 + 0.4,
      trail: starHeight,
    }),
    [minSpeed, maxSpeed, starWidth, starHeight]
  );

  useEffect(() => {
    if (prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawna estrelas em delay aleatório
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    const scheduleSpawn = () => {
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      const t = setTimeout(() => {
        starsRef.current.push(spawnStar(canvas));
        scheduleSpawn();
      }, delay);
      timeouts.push(t);
    };
    // Seed inicial com 2 estrelas
    starsRef.current = [spawnStar(canvas), spawnStar(canvas)];
    scheduleSpawn();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      starsRef.current = starsRef.current.filter((star) => {
        star.x += star.speed * 0.7;
        star.y += star.speed * 0.5;

        if (star.x > canvas.width || star.y > canvas.height) return false;

        // Trilha
        ctx.beginPath();
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = star.trail;
        ctx.moveTo(star.x - star.len * 0.7, star.y - star.len * 0.5);
        ctx.lineTo(star.x, star.y);
        ctx.stroke();

        // Ponta brilhante
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = starColor;
        ctx.globalAlpha = star.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;

        return true;
      });
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      timeouts.forEach(clearTimeout);
      window.removeEventListener("resize", resize);
    };
  }, [prefersReducedMotion, minDelay, maxDelay, starColor, trailColor, spawnStar]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
