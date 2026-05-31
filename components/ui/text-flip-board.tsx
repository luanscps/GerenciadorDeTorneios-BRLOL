"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface FlipBoardProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Dígito individual com animação de flip vertical */
function Digit({ digit, style }: { digit: string; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        position: "relative",
        verticalAlign: "bottom",
        ...style,
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "block" }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Counter animado que incrementa de 0 até value ao montar */
export function FlipBoard({ value, prefix, suffix, className, style }: FlipBoardProps) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const duration = 1200; // ms

  useEffect(() => {
    const from = 0;
    const to = value;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  // Formata número separando milhar
  const formatted = displayed.toLocaleString("pt-BR");
  // Divide em caracteres individuais preservando separadores
  const chars = formatted.split("");

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "baseline", ...style }}>
      {prefix && (
        <span style={{ marginRight: 2 }}>{prefix}</span>
      )}
      {chars.map((char, i) =>
        /[0-9]/.test(char) ? (
          <Digit key={i} digit={char} style={style} />
        ) : (
          <span key={i} style={{ display: "inline-block" }}>{char}</span>
        )
      )}
      {suffix && (
        <span style={{ marginLeft: 2 }}>{suffix}</span>
      )}
    </span>
  );
}
