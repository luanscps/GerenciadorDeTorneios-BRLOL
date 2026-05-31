export default function PlayerProfileLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Hero Banner skeleton ── */}
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          minHeight: 260,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* splash fundo */}
        <div
          className="skeleton"
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 0,
            opacity: 0.4,
          }}
        />
        {/* conteúdo hero */}
        <div
          style={{
            position: 'relative',
            maxWidth: 'var(--content-wide)',
            margin: '0 auto',
            padding: 'var(--sp-8) var(--sp-4)',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 'var(--sp-6)',
            minHeight: 260,
          }}
        >
          {/* Avatar */}
          <div
            className="skeleton"
            style={{
              width: 100, height: 100,
              borderRadius: 'var(--radius-xl)',
              flexShrink: 0,
              border: '3px solid var(--border)',
            }}
          />
          {/* Nome + stats */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', paddingBottom: 'var(--sp-2)' }}>
            <div className="skeleton" style={{ height: 32, width: 220, borderRadius: 'var(--radius-sm)' }} />
            <div className="skeleton" style={{ height: 16, width: 140, borderRadius: 'var(--radius-sm)' }} />
            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-1)' }}>
              {[80, 96, 72, 88].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: 26, width: w, borderRadius: 'var(--radius-full)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Corpo skeleton ── */}
      <div
        style={{
          maxWidth: 'var(--content-wide)',
          margin: '0 auto',
          padding: 'var(--sp-6) var(--sp-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-6)',
        }}
      >
        {/* Rank Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-4)' }}>
          {[0, 1].map((i) => (
            <div key={i} className="card" style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', minHeight: 120 }}>
              <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ height: 20, width: 120, borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ height: 12, width: 60, borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ height: 6, borderRadius: 'var(--radius-full)' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Maestria */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div className="skeleton" style={{ height: 16, width: 140, borderRadius: 'var(--radius-sm)', marginBottom: 'var(--sp-4)' }} />
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: 72, height: 88, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        </div>

        {/* Histórico */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-soft)' }}>
            <div className="skeleton" style={{ height: 14, width: 180, borderRadius: 'var(--radius-sm)' }} />
          </div>
          {/* Linhas */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-3)',
                padding: 'var(--sp-3) var(--sp-4)',
                borderBottom: i < 4 ? '1px solid var(--border-soft)' : 'none',
              }}
            >
              {/* win/loss bar */}
              <div className="skeleton" style={{ width: 4, height: 52, borderRadius: 'var(--radius-full)', flexShrink: 0 }} />
              {/* champion */}
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
              {/* info */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <div className="skeleton" style={{ height: 14, width: 80, borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ height: 12, width: 110, borderRadius: 'var(--radius-sm)' }} />
              </div>
              {/* KDA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', alignItems: 'flex-end' }}>
                <div className="skeleton" style={{ height: 14, width: 64, borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ height: 12, width: 48, borderRadius: 'var(--radius-sm)' }} />
              </div>
              {/* itens */}
              <div style={{ display: 'flex', gap: 4 }} className="hidden sm:flex">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="skeleton" style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
