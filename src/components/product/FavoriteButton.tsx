'use client'

import { useRouter } from 'next/navigation'
import { useSession } from '@/components/auth/SessionProvider'
import { useFavorites } from '@/components/favorites/FavoritesProvider'
import { t } from '@/lib/translations'

interface Props {
  productId: number
  lang: string
  size?: 'sm' | 'md'
  className?: string
}

export function FavoriteButton({ productId, lang, size = 'sm', className = '' }: Props) {
  const session = useSession()
  const { isFavorite, toggleFavorite, isLoading } = useFavorites()
  const router = useRouter()
  const tr = t(lang)
  const active = isFavorite(productId)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!session.is_authenticated) {
      router.push('/auth/login')
      return
    }
    await toggleFavorite(productId)
  }

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const btnSize = size === 'sm' ? 'p-1.5' : 'p-2'

  return (
    <button
      onClick={handleClick}
      aria-label={active ? tr.favorites_remove : tr.favorites_add}
      aria-pressed={active}
      disabled={isLoading}
      className={`relative z-10 rounded-full transition-colors ${btnSize} ${
        active
          ? 'text-red-500 bg-white/80 hover:bg-white'
          : 'text-text-muted bg-white/80 hover:bg-white hover:text-red-400'
      } ${className}`}
    >
      <svg
        className={iconSize}
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
