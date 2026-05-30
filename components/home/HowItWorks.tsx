"use client";
import { motion } from "framer-motion";
import { UserPlus, Shield, ClipboardList, Swords } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

const steps = [
  {
    step: "01",
    title: "Cadastre-se",
    desc: "Crie sua conta e vincule seu Riot ID para importar stats reais diretamente da API da Riot Games.",
    icon: UserPlus,
    wide: true,
  },
  {
    step: "02",
    title: "Monte seu Time",
    desc: "Crie um time 5v5 e convide seus amigos com convite por link.",
    icon: Shield,
    wide: false,
  },
  {
    step: "03",
    title: "Inscreva-se",
    desc: "Encontre um torneio aberto e inscreva seu time.",
    icon: ClipboardList,
    wide: false,
  },
  {
    step: "04",
    title: "Dispute",
    desc: "Jogue, reporte resultados e acompanhe o bracket ao vivo.",
    icon: Swords,
    wide: false,
  },
];

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

export function HowItWorks() {
  return (
    <section>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          color: "var(--text)",
          marginBottom: "var(--sp-8)",
        }}
      >
        Como funciona
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.step}
              variants={item}
              className={idx === 0 ? "md:col-span-3" : ""}
            >
              <CardSpotlight
                className={`h-full flex flex-col gap-4${
                  idx === 0 ? " md:flex-row md:items-center md:gap-8" : ""
                }`}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    minWidth: 52,
                    borderRadius: "var(--radius-lg)",
                    background: "var(--gold-dim)",
                    border: "1px solid var(--border-gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--gold)",
                  }}
                >
                  <Icon size={24} />
                </div>
                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-xs)",
                      color: "var(--gold)",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "var(--sp-1)",
                    }}
                  >
                    PASSO {s.step}
                  </span>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-lg)",
                      color: "var(--text)",
                      fontWeight: 700,
                      marginBottom: "var(--sp-2)",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: "42ch" }}>
                    {s.desc}
                  </p>
                </div>
              </CardSpotlight>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
