"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function StorageSetupPage() {
    const [status, setStatus] = useState<string>("")
    const [loading, setLoading] = useState(false)

    async function createBucket() {
        setLoading(true)
        setStatus("")
        try {
            const res = await fetch("/api/storage/create-bucket", { method: "POST" })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || "Failed")
            setStatus(`OK: ${data.message} (bucket: ${data.bucket})`)
        } catch (e: any) {
            setStatus(`Error: ${e?.message ?? "Unknown"}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Setup Storage Bucket</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Klik tombol di bawah untuk membuat bucket Supabase bernama "music" (atau nama dari NEXT_PUBLIC_SUPABASE_BUCKET)
                        jika belum ada.
                    </p>
                    <Button onClick={createBucket} disabled={loading}>
                        {loading ? "Creating..." : "Create bucket"}
                    </Button>
                    {status && (
                        <div className={`text-sm ${status.startsWith("OK") ? "text-emerald-600" : "text-destructive"}`}>
                            {status}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                        Catatan: Pastikan env berikut sudah di-set: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
                        dan optional NEXT_PUBLIC_SUPABASE_BUCKET.
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
