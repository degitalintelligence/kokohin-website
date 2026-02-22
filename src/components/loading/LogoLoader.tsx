'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function LogoLoader({ src }: { src: string | null }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  // Safety timeout: ensure overlays don't persist indefinitely
  useEffect(() => {
    const t = setTimeout(() => {
      if (!loaded) setLoaded(true)
    }, 4000)
    return () => clearTimeout(t)
  }, [loaded])

  return (
    <div className="relative">
      <div className="relative w-24 h-24 md:w-28 md:h-28 overflow-hidden">
        {src && !failed && (
          <Image
            src={src}
            alt="Kokohin Logo"
            fill
            priority
            className={`object-contain z-10 transition-all duration-500 ease-out ${loaded ? 'opacity-100 scale-100' : 'opacity-80 scale-95'}`}
            onLoadingComplete={() => setLoaded(true)}
            onLoad={() => setLoaded(true)}
            onError={() => { setFailed(true); setLoaded(false) }}
          />
        )}
        {!loaded && !failed && (
          <div className="sheen-overlay z-20">
            <div className="sheen-bar" />
          </div>
        )}
        {failed && (
          <div className="sheen-overlay">
            <div className="sheen-bar" />
          </div>
        )}
      </div>
    </div>
  )
}
