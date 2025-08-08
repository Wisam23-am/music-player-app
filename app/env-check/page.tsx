export default function EnvCheckPage() {
    // Nilai ini dibaca saat build/server render
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

    const mask = (v: string) => (v ? `${v.slice(0, 12)}… (${v.length} chars)` : "(empty)")

    return (
        <main className="min-h-screen p-6">
            <div className="mx-auto max-w-xl space-y-4">
                <h1 className="text-2xl font-semibold">Environment Check</h1>
                <p className="text-sm text-muted-foreground">
                    Halaman ini menampilkan ringkas nilai environment untuk Supabase.
                    Jika masih (empty), pastikan sudah menambahkan variabel dan me-restart dev server/deploy ulang.
                </p>

                <div className="rounded-lg border p-4">
                    <div className="mb-2 font-medium">NEXT_PUBLIC_SUPABASE_URL</div>
                    <code className="block rounded bg-muted p-2 text-sm">{mask(url)}</code>
                </div>
                <div className="rounded-lg border p-4">
                    <div className="mb-2 font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
                    <code className="block rounded bg-muted p-2 text-sm">{mask(anon)}</code>
                </div>

                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    <li>Jika kamu baru menambahkan env, hentikan dan jalankan ulang npm run dev.</li>
                    <li>Pastikan nama variabel diawali NEXT_PUBLIC_ agar tersedia di client. [^2]</li>
                    <li>Untuk v0/Vercel preview, gunakan Project Settings → Environment Variables (bukan .env file).</li>
                </ul>
            </div>
        </main>
    )
}
