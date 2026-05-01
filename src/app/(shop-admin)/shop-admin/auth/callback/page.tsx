'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const success = params.get('success')
  const newUser = params.get('new_user')
  const error = params.get('error')

  useEffect(() => {
    if (success === '1' && newUser === '1') {
      router.replace('/shop-admin/onboarding?resume=oauth')
    } else if (success === '1') {
      router.replace('/shop-admin/')
    } else {
      router.replace(`/shop-admin/onboarding?error=${error ?? 'oauth_failed'}`)
    }
  }, [success, newUser, error, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function ShopOwnerAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  )
}
