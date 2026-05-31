export default function JogadoresLoading() {
  return (
    <main
      className="min-h-screen"
      style={{
        background: 'var(--bg)',
        paddingTop: 'var(--sp-10)',
        paddingBottom: 'var(--sp-10)',
        paddingInline: 'var(--sp-4)',
      }}
    >
      <div style={{ maxWidth: 'var(--content-default)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>

        {/* Cabeçalho skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <div className="skeleton" style={{ height: 32, width: 180, borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ height: 16, width: 120, borderRadius: 'var(--radius-sm)' }} />
        </div>

        {/* Filtros skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div className="skeleton" style={{ height: 38, width: 320, borderRadius: 'var(--radius-md)' }} />
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 28, width: 60 + i * 8, borderRadius: 'var(--radius-full)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 28, width: 64, borderRadius: 'var(--radius-full)' }} />
            ))}
          </div>
        </div>

        {/* Lista skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="card-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}
            >
              <div className="skeleton" style={{ width: 24, height: 16, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <div className="skeleton" style={{ height: 14, width: `${140 + (i % 3) * 30}px`, borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 'var(--radius-sm)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', alignItems: 'flex-end' }}>
                <div className="skeleton" style={{ height: 14, width: 80, borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ height: 12, width: 48, borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
