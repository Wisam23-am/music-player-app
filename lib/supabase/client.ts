"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

const getDevKeys = () => {
    try {
        if (typeof window === "undefined") return null
        const url = localStorage.getItem("DEV_SUPABASE_URL")
        const anon = localStorage.getItem("DEV_SUPABASE_ANON")
        if (url && anon) return { url, anon }
    } catch { }
    return null
}

export function getSupabaseClient() {
    if (client) return client

    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    let url = envUrl
    let anon = envAnon
    if (!url || !anon) {
        const dev = getDevKeys()
        if (dev) {
            url = dev.url
            anon = dev.anon
        }
    }
    if (!url || !anon) {
        const hint = [
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
            "Perbaiki dengan salah satu cara:",
            "- Opsi 1 (disarankan): .env.local di root project, lalu restart `npm run dev`.",
            "- Opsi 2 (dev saja): buka /dev/supabase-config, isi DEV_SUPABASE_URL & DEV_SUPABASE_ANON.",
            "Halaman cek: /env-check"
        ].join("\n")
        throw new Error(hint)
    }

    client = createClient(url, anon, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })
    return client
}
