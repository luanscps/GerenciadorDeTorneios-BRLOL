import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFoundJogador() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div
          className="mx-auto mb-6 flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: "var(--radius-xl)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            margin: "0 auto var(--sp-6)",
          }}
        >
          <SearchX size={32} />
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: "var(--sp-2)",
          }}
        >
          Jogador não encontrado
        </h1>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            marginBottom: "var(--sp-6)",
          }}
        >
          Verifique o nick e a tag e tente novamente.
        </p>
        <Link href="/jogadores" className="btn-primary">
          ← Voltar para Jogadores
        </Link>
      </div>
    </div>
  );
}
