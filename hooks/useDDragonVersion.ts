/**
 * useDDragonVersion
 * React hook that fetches and caches the current DDragon patch version.
 *
 * Usage:
 *   const { version, loading } = useDDragonVersion()
 *   const iconUrl = version ? ddChampionIcon('Aatrox', version) : ''
 */

import { useEffect, useState } from 'react'

let _cachedVersion: string | null = null

export function useDDragonVersion() {
  const [version, setVersion] = useState<string | null>(_cachedVersion)
  const [loading, setLoading] = useState(!_cachedVersion)

  useEffect(() => {
    if (_cachedVersion) {
      setVersion(_cachedVersion)
      setLoading(false)
      return
    }

    fetch('/api/riot/ddragon-version')
      .then((r) => r.json())
      .then((data) => {
        _cachedVersion = data.version
        setVersion(data.version)
      })
      .catch((err) => {
        console.error('[useDDragonVersion] failed:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  return { version, loading }
}
