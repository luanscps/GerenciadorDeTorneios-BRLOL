"use client";
import { motion } from "framer-motion";
import { Users, Shield, Trophy, Map } from "lucide-react";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { FlipBoard } from "@/components/ui/text-flip-board";

interface StatsSectionProps {
  totalPlayers: number;
  totalTeams: number;
  totalTournaments: number;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

interface StatItem {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  numeric: boolean;
}

export function StatsSection({
  totalPlayers,
  totalTeams,
  totalTournaments,
}: StatsSectionProps) {
  const stats: StatItem[] = [
    { label: "Invocadores", value: totalPlayers,     icon: <Users  size={22} />, numeric: true  },
    { label: "Times",       value: totalTeams,       icon: <Shield size={22} />, numeric: true  },
    { label: "Torneios",    value: totalTournaments, icon: <Trophy size={22} />, numeric: true  },
    { label: "Mapa",        value: "SR 5v5",         icon: <Map    size={22} />, numeric: false },
  ];

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-xl)",
        padding: "var(--sp-8) var(--sp-4)",
        background: "linear-gradient(135deg, rgba(200,168,75,0.04) 0%, transparent 60%)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Shooting stars de fundo */}
      <ShootingStars
        minSpeed={6}
        maxSpeed={18}
        minDelay={1200}
        maxDelay={4000}
        starColor="#C8A84B"
        trailColor="rgba(200,168,75,0.10)"
        starWidth={1.5}
        starHeight={1}
      />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ position: "relative", zIndex: 1 }}
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={item}
            className="card text-center py-6 cursor-default"
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            style={{ background: "rgba(10,20,40,0.7)", backdropFilter: "blur(8px)" }}
          >
            {/* Ícone */}
            <div
              className="mx-auto mb-3 flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                background: "var(--gold-dim)",
                border: "1px solid var(--border-gold)",
                color: "var(--gold)",
              }}
            >
              {s.icon}
            </div>

            {/* Valor — numérico usa FlipBoard, texto usa span normal */}
            <div
              className="font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                color: "var(--gold)",
                lineHeight: 1.1,
                minHeight: "1.4em",
              }}
            >
              {s.numeric ? (
                <FlipBoard
                  value={s.value as number}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-xl)",
                    fontWeight: 700,
                    color: "var(--gold)",
                    lineHeight: 1.1,
                  }}
                />
              ) : (
                <span>{s.value}</span>
              )}
            </div>

            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                marginTop: "var(--sp-1)",
              }}
            >
              {s.label}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
