'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ReviewPhoto } from '@/types/api'
import { toRelativeImageUrl } from '@/lib/utils'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

interface Props {
  photos: ReviewPhoto[]
}

export function ReviewPhotoGrid({ photos }: Props) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const approved = photos.filter((p) => p.status === 'approved')
  if (approved.length === 0) return null

  const slides = approved.map((p) => ({ src: toRelativeImageUrl(p.url) ?? p.url }))

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {approved.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => { setIndex(i); setOpen(true) }}
            className="w-16 h-16 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Photo ${i + 1}`}
          >
            <Image
              src={toRelativeImageUrl(photo.thumbnail_url) ?? toRelativeImageUrl(photo.url) ?? ''}
              alt=""
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
      />
    </>
  )
}
