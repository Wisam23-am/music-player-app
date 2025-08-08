import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !serviceKey) {
            return NextResponse.json(
                { ok: false, error: "Missing SUPABASE env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
                { status: 500 }
            )
        }
        const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "music"
        const admin = createClient(url, serviceKey)

        // Coba create bucket (public)
        const { error } = await admin.storage.createBucket(bucket, { public: true })
        if (error && !/already exists/i.test(error.message)) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true, bucket, message: "Bucket ready (created or already exists)." })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 })
    }
}
