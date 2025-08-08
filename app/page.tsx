"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import MusicPlayerApp from "@/components/music-player-app"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </main>
    )
  }

  if (!userId) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Music Player</h1>
          <p className="text-muted-foreground">
            Please log in to upload your music, manage playlists, and listen to your library.
          </p>
          <Button asChild>
            <Link href="/login">Go to Login / Register</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <MusicPlayerApp />
    </main>
  )
}
