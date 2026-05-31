"use client";
import { motion } from "framer-motion";
import { UserPlus, Shield, ClipboardList, Swords } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

// ---------------------------------------------------------------------------
// Dados dos steps
// ---------------------------------------------------------------------------
const steps = [
  {
    step: "01",
    title: "Cadastre-se",
    desc: "Crie sua conta e vincule seu Riot ID para importar stats reais diretamente da API da Riot Games. Rank, histórico de partidas e maestria de campeões sincronizados automaticamente.",
    icon: UserPlus,
    // Layout Bento: tall card à esquerda, 2 colunas de largura e 2 linhas de altura
    colSpan: "md:col-span-2",
    rowSpan: "md:row-span-2",
    horizontal: false,
    spotlightRadius: 450,
  },
  {
    step: "02",
    title: "Monte seu Time",
    desc: "Crie um time 5v5 e convide seus amigos com convite por link.",
    icon: Shield,
    colSpan: "md:col-span-1",
    rowSpan: "",
    horizontal: false,
    spotlightRadius: 350,
  },
  {
    step: "03",
    title: "Inscreva-se",
    desc: "Encontre um torneio aberto e inscreva seu time em segundos.",
    icon: ClipboardList,
    colSpan: "md:col-span-1",
    rowSpan: "",
    horizontal: false,
    spotlightRadius: 350,
  },
  {
    step: "04",
    title: "Dispute & Acompanhe",
    desc: "Jogue as partidas via Tournament Code, reporte resultados e assista o bracket ao vivo atualizar em tempo real.",
    icon: Swords,
    // Full-width na linha de baixo, layout horizontal
    colSpan: "md:col-span-3",
    rowSpan: "",
    horizontal: true,
    spotlightRadius: 500,
  },
];

// ---------------------------------------------------------------------------
// Animações
// ---------------------------------------------------------------------------
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const itemVariant = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function HowItWorks() {
  return (
    <section>
      {/* Título da seção */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: "var(--sp-8)" }}
      >
        <p
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold)",
            marginBottom: "var(--sp-2)",
          }}
        >
          Passo a passo
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            color: "var(--text)",
            fontWeight: 700,
          }}
        >
          Como funciona
        </h2>
      </motion.div>

      {/* Grid Bento */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-[auto_auto_auto] gap-4"
      >
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.step}
              variants={itemVariant}
              className={[s.colSpan, s.rowSpan].filter(Boolean).join(" ")}
              style={{ minHeight: s.rowSpan ? 260 : undefined }}
            >
              <CardSpotlight
                radius={s.spotlightRadius}
                className={[
                  "h-full relative",
                  s.horizontal
                    ? "flex flex-col md:flex-row md:items-center gap-6"
                    : "flex flex-col gap-4",
                ].join(" ")}
              >
                {/* Background label — número do step como watermark */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: "-0.05em",
                    bottom: "-0.25em",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(4rem, 10vw, 8rem)",
                    fontWeight: 900,
                    color: "var(--text-faint)",
                    opacity: 0.18,
                    lineHeight: 1,
                    userSelect: "none",
                    pointerEvents: "none",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {s.step}
                </span>

                {/* Ícone */}
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
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Icon size={24} />
                </div>

                {/* Conteúdo */}
                <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
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
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-muted)",
                      maxWidth: s.horizontal ? "60ch" : "34ch",
                      lineHeight: 1.65,
                    }}
                  >
                    {s.desc}
                  </p>

                  {/* Conector visual — apenas no card 01 (tall) */}
                  {s.step === "01" && (
                    <div
                      aria-hidden="true"
                      style={{
                        marginTop: "var(--sp-6)",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--sp-2)",
                      }}
                    >
                      <div
                        style={{
                          width: 1,
                          height: 40,
                          borderLeft: "1px dashed var(--border)",
                          opacity: 0.5,
                          marginLeft: 1,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-faint)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        continue abaixo
                      </span>
                    </div>
                  )}
                </div>
              </CardSpotlight>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
