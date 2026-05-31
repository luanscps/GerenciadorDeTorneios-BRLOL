"use client";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { rankEmblemUrl } from "@/lib/riot";

const TIER_COLORS: Record<string, string> = {
  IRON: "#8B7A6B",
  BRONZE: "#CD7F32",
  SILVER: "#A8A9AD",
  GOLD: "#FFD700",
  PLATINUM: "#00E5CC",
  EMERALD: "#50C878",
  DIAMOND: "#99CCFF",
  MASTER: "#9B59B6",
  GRANDMASTER: "#E74C3C",
  CHALLENGER: "#00D4FF",
};

interface RankEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
}

/** Contador de LP animado com spring */
function AnimatedLP({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 1.2, ease: "easeOut" });
    return controls.stop;
  }, [value, motionVal]);

  return (
    <motion.span className="font-semibold tabular-nums" style={{ color: "var(--text)", fontSize: "var(--text-sm)" }}>
      {display}
    </motion.span>
  );
}

/** Barra de winrate com largura animada via framer-motion */
function WinrateBar({ wr, color }: { wr: number; color: string }) {
  return (
    <div className="flex items-center gap-2" style={{ marginTop: "var(--sp-2)" }}>
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: 9999,
          background: "rgba(30,58,95,0.6)",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${wr}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{
            height: "100%",
            borderRadius: 9999,
            background: wr >= 50 ? "#4ADE80" : "#F87171",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          minWidth: 38,
          color: wr >= 50 ? "#4ADE80" : "#F87171",
        }}
      >
        {wr}%
      </span>
    </div>
  );
}

export function RankCard({ r }: { r: RankEntry }) {
  const color = TIER_COLORS[r.tier] ?? "#fff";
  const total = r.wins + r.losses;
  const wr = total > 0 ? Math.round((r.wins / total) * 100) : 0;

  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  const spotX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const spotY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const background = useTransform(
    [spotX, spotY],
    ([x, y]: number[]) =>
      `radial-gradient(200px circle at ${x}px ${y}px, ${color}22, transparent 70%)`
  );

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      style={{
        background: `linear-gradient(135deg, ${color}0D 0%, var(--surface) 45%)`,
        border: `1px solid ${color}33`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--sp-5)",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        boxShadow: `0 4px 20px rgba(0,0,0,0.35)`,
      }}
    >
      {/* Spotlight glow — segue cursor */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          background,
          pointerEvents: "none",
          borderRadius: "inherit",
        }}
      />

      {/* Drop-shadow no emblema */}
      <div className="flex items-center gap-4" style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            filter: `drop-shadow(0 0 12px ${color}55) drop-shadow(0 0 4px ${color}33)`,
            flexShrink: 0,
          }}
        >
          <img
            src={rankEmblemUrl(r.tier)}
            width={80}
            height={80}
            alt={r.tier}
            style={{ width: 80, height: 80, objectFit: "contain" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label fila */}
          <p
            style={{
              color: "var(--text-faint)",
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "var(--sp-1)",
            }}
          >
            {r.queueType === "RANKED_SOLO_5x5" ? "Solo / Duo" : "Flex 5v5"}
          </p>

          {/* Tier + Rank */}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: 800,
              color,
              lineHeight: 1.1,
              marginBottom: "var(--sp-1)",
            }}
          >
            {r.tier}{" "}
            <span style={{ fontSize: "var(--text-lg)", fontWeight: 600 }}>{r.rank}</span>
          </p>

          {/* LP animado */}
          <p style={{ marginBottom: "var(--sp-2)", display: "flex", alignItems: "baseline", gap: 4 }}>
            <AnimatedLP value={r.leaguePoints} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>LP</span>
          </p>

          {/* Barra winrate animada */}
          <WinrateBar wr={wr} color={color} />

          {/* Stats */}
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--sp-1)" }}>
            {r.wins}V · {r.losses}D · {total} jogos
          </p>

          {/* Badges */}
          {(r.hotStreak || r.veteran) && (
            <div className="flex flex-wrap gap-1" style={{ marginTop: "var(--sp-2)" }}>
              {r.hotStreak && (
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    background: "rgba(249,115,22,0.12)",
                    color: "#FB923C",
                    border: "1px solid rgba(249,115,22,0.28)",
                    borderRadius: 9999,
                    padding: "2px 8px",
                    fontWeight: 700,
                  }}
                >
                  🔥 Hot Streak
                </span>
              )}
              {r.veteran && (
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    background: "var(--gold-dim)",
                    color: "var(--gold)",
                    border: "1px solid var(--border-gold)",
                    borderRadius: 9999,
                    padding: "2px 8px",
                    fontWeight: 700,
                  }}
                >
                  ⚔️ Veterano
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
