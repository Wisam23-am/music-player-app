"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "../lib/supabase/client"

export default function AuthForm() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<"login" | "register">("login")

    useEffect(() => {
        const supabase = getSupabaseClient()
        supabase.auth.getSession().then(({ data }: { data: { session: unknown | null } }) => {
            if (data.session) router.replace("/")
        })
    }, [router])

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const supabase = getSupabaseClient()
        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            } else {
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
            }
            router.replace("/")
        } catch (err: any) {
            setError(err?.message ?? "Authentication error")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>{mode === "login" ? "Sign in" : "Register"}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex gap-2">
                    <Button
                        type="button"
                        variant={mode === "login" ? "default" : "outline"}
                        onClick={() => setMode("login")}
                    >
                        Login
                    </Button>
                    <Button
                        type="button"
                        variant={mode === "register" ? "default" : "outline"}
                        onClick={() => setMode("register")}
                    >
                        Register
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div className="text-sm text-destructive">{error}</div>}
                    <Button type="submit" disabled={loading}>
                        {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
