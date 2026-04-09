'use client'
import dynamic from 'next/dynamic'

const ShopMap = dynamic(() => import('./ShopMap').then(m => ({ default: m.ShopMap })), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-surface-alt animate-pulse rounded-xl" style={{ minHeight: '200px' }} />,
})

interface ShopPin {
  id: number
  name: string
  lat: number
  lng: number
}

interface ShopMapClientProps {
  shops: ShopPin[]
  className?: string
  center?: [number, number]
  zoom?: number
  lang?: string
}

export function ShopMapClient(props: ShopMapClientProps) {
  return <ShopMap {...props} />
}
