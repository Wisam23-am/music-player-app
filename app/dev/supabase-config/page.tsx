"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SupabaseConfigDev() {
    const [url, setUrl] = useState("")
    const [anon, setAnon] = useState("")
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        try {
            const u = localStorage.getItem("DEV_SUPABASE_URL") || ""
            const a = localStorage.getItem("DEV_SUPABASE_ANON") || ""
            setUrl(u)
            setAnon(a)
        } catch { }
    }, [])

    const save = () => {
        try {
            localStorage.setItem("DEV_SUPABASE_URL", url)
            localStorage.setItem("DEV_SUPABASE_ANON", anon)
            setSaved(true)
            setTimeout(() => setSaved(false), 1500)
        } catch (e) {
            alert("Gagal menyimpan ke localStorage.")
        }
    }

    const clearAll = () => {
        localStorage.removeItem("DEV_SUPABASE_URL")
        localStorage.removeItem("DEV_SUPABASE_ANON")
        setUrl("")
        setAnon("")
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-xl">
                <CardHeader>
                    <CardTitle>Dev Supabase Config (Tanpa .env)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Halaman ini hanya untuk pengembangan lokal. Isi URL dan anon key Supabase untuk disimpan di localStorage.
                        Produksi sebaiknya menggunakan .env atau Environment Variables di Vercel.
                    </p>

                    <div className="grid gap-2">
                        <Label htmlFor="supabase-url">DEV_SUPABASE_URL</Label>
                        <Input
                            id="supabase-url"
                            placeholder="https://YOUR-PROJECT.supabase.co"
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="supabase-anon">DEV_SUPABASE_ANON</Label>
                        <Input
                            id="supabase-anon"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={anon}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnon(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={save}>{saved ? "Tersimpan ✓" : "Simpan"}</Button>
                        <Button variant="outline" onClick={clearAll}>Bersihkan</Button>
                    </div>

                    <div className="rounded-md border p-3 text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Catatan:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Jika .env tersedia, aplikasi akan memakai .env terlebih dulu.</li>
                            <li>Fallback ini membaca localStorage ketika .env kosong.</li>
                            <li>Jangan gunakan cara ini untuk produksi.</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
