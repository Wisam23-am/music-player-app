"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ListMusic, Plus, Globe, Loader2, LogOut, FolderPlus, Check, MoreVertical, Trash2 } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleSlider as Slider } from "./simple-slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { LanguageProvider, useI18n } from "@/lib/i18n"
import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { useRouter } from "next/navigation"

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "music"
const DEFAULT_COVER = "https://th.bing.com/th/id/OIF.ZoNLM0I52k2FF8zyN099Ow?w=177&h=180&c=7&r=0&o=5&dpr=1.3&pid=1.7"

type RepeatMode = "off" | "one" | "all"

type Playlist = {
    id: string
    name: string
}

type Track = {
    id: string
    title: string
    artist: string
    src: string
    cover?: string
    duration?: number
    mimeType?: string
    size?: number
    filePath?: string // storage path for deletion
}

const STORAGE_KEYS = {
    settings: "mp_settings_v2",
}

type Settings = {
    volume: number
    shuffle: boolean
    repeat: RepeatMode
    lang: "en" | "id" | "zh" | "ja"
    theme: "light" | "dark" | "system"
}

function getExtension(url: string) {
    const m = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)
    return m?.[1]?.toLowerCase() ?? ""
}

function isLikelySupported(url: string) {
    const ext = getExtension(url)
    if (!ext) return true
    const supported = ["mp3", "m4a", "aac", "ogg", "wav", "webm", "opus"]
    return supported.includes(ext)
}

function formatTime(sec?: number) {
    if (sec == null || Number.isNaN(sec)) return "0:00"
    const s = Math.floor(sec % 60)
    const m = Math.floor(sec / 60)
    return `${m}:${s.toString().padStart(2, "0")}`
}

function humanSize(bytes?: number) {
    if (!bytes && bytes !== 0) return ""
    const units = ["B", "KB", "MB", "GB"]
    let i = 0
    let v = bytes
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024
        i++
    }
    return `${v.toFixed(1)} ${units[i]}`
}

function usePersistentState<T>(key: string, initial: T) {
    const [state, setState] = useState<T>(initial)
    const [hydrated, setHydrated] = useState(false)
    useEffect(() => {
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null
            if (raw) {
                const parsed = JSON.parse(raw) as T
                setState((prev) => (Object.is(prev, parsed) ? prev : parsed))
            }
        } catch { } finally {
            setHydrated(true)
        }
    }, [key])
    useEffect(() => {
        if (!hydrated) return
        try {
            localStorage.setItem(key, JSON.stringify(state))
        } catch { }
    }, [hydrated, key, state])
    return [state, setState] as const
}

function useAudioPlayer(tracks: Track[]) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = usePersistentState<Settings>(STORAGE_KEYS.settings, {
        volume: 0.9,
        shuffle: false,
        repeat: "off",
        lang: "id",
        theme: "system",
    })
    const [history, setHistory] = useState<number[]>([])
    const [lastError, setLastError] = useState<string | null>(null)
    const currentTrack = tracks[currentIndex]

    useEffect(() => {
        const audio = new Audio()
        audioRef.current = audio
        audio.preload = "metadata"
        audio.volume = settings.volume

        const onTime = () => setCurrentTime(audio.currentTime)
        const onLoaded = () => {
            setDuration(audio.duration || 0)
            setLoading(false)
        }
        const onWaiting = () => setLoading(true)
        const onPlay = () => setIsPlaying(true)
        const onPause = () => setIsPlaying(false)
        const onEnded = () => handleNextAuto()
        const onError = () => {
            const code = audio.error?.code
            const msg =
                code === 1
                    ? "Aborted"
                    : code === 2
                        ? "Network error while loading audio"
                        : code === 3
                            ? "Decoding error (format not supported)"
                            : code === 4
                                ? "Source not supported or URL unreachable"
                                : "Unknown audio error"
            setLastError(msg)
            setLoading(false)
            setIsPlaying(false)
        }

        audio.addEventListener("timeupdate", onTime)
        audio.addEventListener("loadedmetadata", onLoaded)
        audio.addEventListener("waiting", onWaiting)
        audio.addEventListener("playing", () => setLoading(false))
        audio.addEventListener("play", onPlay)
        audio.addEventListener("pause", onPause)
        audio.addEventListener("ended", onEnded)
        audio.addEventListener("error", onError)

        return () => {
            audio.pause()
            audio.src = ""
            audio.removeEventListener("timeupdate", onTime)
            audio.removeEventListener("loadedmetadata", onLoaded)
            audio.removeEventListener("waiting", onWaiting)
            audio.removeEventListener("play", onPlay)
            audio.removeEventListener("pause", onPause)
            audio.removeEventListener("ended", onEnded)
            audio.removeEventListener("error", onError)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const audio = audioRef.current
        if (!audio || tracks.length === 0) return
        const src = currentTrack?.src || ""
        if (!src) {
            setIsPlaying(false)
            setLoading(false)
            setLastError("No source URL.")
            return
        }
        if (!isLikelySupported(src)) {
            setIsPlaying(false)
            setLoading(false)
            setLastError("Unsupported file type.")
            return
        }
        setLoading(true)
        setCurrentTime(0)
        setDuration(0)
        setLastError(null)
        audio.src = src
        const playIfShould = async () => {
            try {
                if (isPlaying) await audio.play()
            } catch (err: any) {
                setLastError(err?.message || "Failed to start playback.")
                setLoading(false)
            }
        }
        void playIfShould()
    }, [currentIndex, tracks.map((t) => t.src).join("|")]) // re-eval when srcs change

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = settings.volume
    }, [settings.volume])

    const togglePlay = async () => {
        const audio = audioRef.current
        if (!audio) return
        if (audio.paused) {
            setLoading(true)
            try {
                await audio.play()
                setLastError(null)
            } catch (err: any) {
                setLastError(err?.message || "Failed to play audio.")
            } finally {
                setLoading(false)
            }
        } else {
            audio.pause()
        }
    }

    const seek = (sec: number) => {
        const audio = audioRef.current
        if (!audio || Number.isNaN(sec)) return
        audio.currentTime = sec
        setCurrentTime(sec)
    }

    const setVolume = (v: number) => setSettings({ ...settings, volume: v })

    const nextIndex = () => {
        if (tracks.length === 0) return 0
        if (settings.shuffle) {
            if (tracks.length === 1) return currentIndex
            let idx = currentIndex
            while (idx === currentIndex) idx = Math.floor(Math.random() * tracks.length)
            return idx
        }
        return (currentIndex + 1) % tracks.length
    }

    const prevIndex = () => {
        if (tracks.length === 0) return 0
        if (settings.shuffle && history.length > 0) {
            const prev = history[history.length - 1]
            setHistory((h) => h.slice(0, -1))
            return prev
        }
        return (currentIndex - 1 + tracks.length) % tracks.length
    }

    const next = () => {
        if (settings.shuffle) setHistory((h) => [...h, currentIndex])
        setCurrentIndex(nextIndex())
    }

    const prev = () => setCurrentIndex(prevIndex())

    const handleNextAuto = () => {
        if (settings.repeat === "one") {
            const audio = audioRef.current
            if (!audio) return
            audio.currentTime = 0
            void audio.play().catch(() => { })
            return
        }
        if (settings.repeat === "all" || settings.shuffle) {
            if (settings.shuffle) setHistory((h) => [...h, currentIndex])
            setCurrentIndex(nextIndex())
            return
        }
        if (currentIndex < tracks.length - 1) {
            setCurrentIndex(currentIndex + 1)
        } else {
            setIsPlaying(false)
            const audio = audioRef.current
            if (audio) {
                audio.currentTime = 0
                audio.pause()
            }
        }
    }

    const setRepeatMode = (mode: RepeatMode) => setSettings({ ...settings, repeat: mode })
    const toggleShuffle = () => setSettings({ ...settings, shuffle: !settings.shuffle })
    const setLang = useCallback(
        (l: Settings["lang"]) => setSettings((prev) => (prev.lang === l ? prev : { ...prev, lang: l })),
        []
    )
    const setTheme = useCallback(
        (t: Settings["theme"]) => setSettings((prev) => (prev.theme === t ? prev : { ...prev, theme: t })),
        []
    )

    return {
        currentIndex,
        setCurrentIndex,
        currentTrack,
        isPlaying,
        togglePlay,
        currentTime,
        duration,
        seek,
        volume: settings.volume,
        setVolume,
        next,
        prev,
        repeat: settings.repeat,
        setRepeatMode,
        shuffle: settings.shuffle,
        toggleShuffle,
        loading,
        lastError,
        lang: settings.lang,
        setLang,
        theme: settings.theme,
        setTheme,
    }
}

function sanitizeFilename(name: string) {
    return name.replace(/[^\w.-]+/g, "_")
}

function PlaylistList({
    playlists,
    selectedId,
    onSelect,
    onCreate,
    onDeletePlaylist,
    t,
}: {
    playlists: Playlist[]
    selectedId: string | null
    onSelect: (id: string) => void
    onCreate: (name: string) => void
    onDeletePlaylist: (playlist: Playlist) => void
    t: (k: string) => string
}) {
    const [newOpen, setNewOpen] = useState(false)
    const [name, setName] = useState("")

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="font-medium">{t("playlistsTitle")}</div>
                <Dialog open={newOpen} onOpenChange={setNewOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1">
                            <FolderPlus className="h-4 w-4" />
                            {t("newPlaylist")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>{t("newPlaylist")}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <Label htmlFor="pl-name">{t("playlistName")}</Label>
                            <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("playlistName")} />
                        </div>
                        <DialogFooter className="sm:justify-end">
                            <Button
                                onClick={() => {
                                    if (!name.trim()) return
                                    onCreate(name.trim())
                                    setName("")
                                    setNewOpen(false)
                                }}
                            >
                                {t("create")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="space-y-1">
                {playlists.map((p) => (
                    <div
                        key={p.id}
                        className={cn(
                            "group w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted",
                            selectedId === p.id && "bg-muted"
                        )}
                    >
                        <button className="flex-1 text-left truncate" onClick={() => onSelect(p.id)}>
                            {p.name}
                        </button>
                        <div className="ml-2 flex items-center gap-1">
                            {selectedId === p.id && <Check className="h-4 w-4" aria-hidden />}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-70 hover:opacity-100"
                                onClick={() => onDeletePlaylist(p)}
                                aria-label={t("deletePlaylist")}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {playlists.length === 0 && <div className="text-xs text-muted-foreground">{t("noPlaylistsYet")}</div>}
            </div>
        </div>
    )
}

function AddTrackDialog({
    playlists,
    onUpload,
    t,
}: {
    playlists: Playlist[]
    onUpload: (args: { file: File; title: string; artist: string; playlistId: string }) => void
    t: (k: string) => string
}) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [artist, setArtist] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [playlistId, setPlaylistId] = useState<string>("")

    useEffect(() => {
        if (!playlistId && playlists[0]) setPlaylistId(playlists[0].id)
    }, [playlists, playlistId])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("addTrack")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("addTrack")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">{t("title")}</Label>
                        <Input id="title" placeholder={t("titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="artist">{t("artist")}</Label>
                        <Input id="artist" placeholder={t("artistPlaceholder")} value={artist} onChange={(e) => setArtist(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="file">{t("localFile")}</Label>
                        <Input
                            id="file"
                            type="file"
                            accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/webm,audio/*"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
                        />
                        <div className="text-xs text-muted-foreground">{t("onlyLocalInfo")}</div>
                    </div>
                    <div className="grid gap-2">
                        <Label id="addtrack-playlist-label" htmlFor="addtrack-playlist">
                            {t("selectPlaylist")}
                        </Label>
                        <select
                            id="addtrack-playlist"
                            aria-labelledby="addtrack-playlist-label"
                            title={t("selectPlaylist")}
                            className="h-9 rounded-md border bg-background px-3 text-sm"
                            value={playlistId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlaylistId(e.target.value)}
                        >
                            {playlists.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <DialogFooter className="sm:justify-end">
                    <Button
                        disabled={!file || !title.trim() || !artist.trim() || !playlistId}
                        onClick={() => {
                            if (!file || !playlistId) return
                            onUpload({ file, title: title.trim(), artist: artist.trim(), playlistId })
                            setOpen(false)
                            setTitle("")
                            setArtist("")
                            setFile(null)
                        }}
                    >
                        {t("addLocal")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function MusicPlayerApp() {
    const router = useRouter()
    const supabase = getSupabaseClient()
    const [userId, setUserId] = useState<string | null>(null)
    const [playlists, setPlaylists] = useState<Playlist[]>([])
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
    const [tracks, setTracks] = useState<Track[]>([])

    // Confirms
    const [trackToDelete, setTrackToDelete] = useState<Track | null>(null)
    const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null)

    const player = useAudioPlayer(tracks)
    const {
        currentTrack,
        currentIndex,
        setCurrentIndex,
        isPlaying,
        togglePlay,
        currentTime,
        duration,
        seek,
        volume,
        setVolume,
        next,
        prev,
        repeat,
        setRepeatMode,
        shuffle,
        toggleShuffle,
        loading,
        lastError,
        lang,
        setLang,
        theme,
        setTheme,
    } = player

    const { t } = useI18n()

    useEffect(() => {
        supabase.auth.getUser().then(({ data, error }) => {
            if (error || !data.user) {
                router.replace("/login")
                return
            }
            setUserId(data.user.id)
        })
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            const uid = session?.user?.id ?? null
            setUserId(uid)
            if (!uid) router.replace("/login")
        })
        return () => sub?.subscription.unsubscribe()
    }, [router, supabase])

    const fetchPlaylists = useCallback(async () => {
        if (!userId) return
        const { data, error } = await supabase
            .from("playlists")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
        if (error) {
            console.error(error)
            setPlaylists([])
            return
        }
        setPlaylists(data as any)
        if (!selectedPlaylistId && data.length > 0) setSelectedPlaylistId(data[0].id)
    }, [supabase, userId, selectedPlaylistId])

    const fetchTracks = useCallback(
        async (playlistId: string) => {
            if (!userId) return
            // Join playlist_tracks -> tracks
            const { data, error } = await supabase
                .from("playlist_tracks")
                .select("tracks(*), track_id")
                .eq("playlist_id", playlistId)
                .order("created_at", { ascending: true })
            if (error) {
                console.error(error)
                setTracks([])
                return
            }
            const tks: Track[] = (data ?? []).map((row: any) => ({
                id: row.tracks.id,
                title: row.tracks.title,
                artist: row.tracks.artist,
                src: row.tracks.public_url,
                cover: DEFAULT_COVER, // force single default cover
                duration: row.tracks.duration ?? undefined,
                mimeType: row.tracks.mime_type ?? undefined,
                size: row.tracks.size ?? undefined,
                filePath: row.tracks.file_path ?? undefined,
            }))
            setTracks(tks)
            setCurrentIndex(0)
        },
        [supabase, userId, setCurrentIndex]
    )

    useEffect(() => {
        void fetchPlaylists()
    }, [fetchPlaylists])

    useEffect(() => {
        if (selectedPlaylistId) void fetchTracks(selectedPlaylistId)
    }, [selectedPlaylistId, fetchTracks])

    const createPlaylist = async (name: string) => {
        if (!userId) return
        const { data, error } = await supabase.from("playlists").insert({ name, user_id: userId }).select("*").single()
        if (error) return
        setPlaylists((prev) => [...prev, { id: data.id, name: data.name }])
        setSelectedPlaylistId(data.id)
    }

    const extractDuration = (file: File): Promise<number | undefined> => {
        return new Promise((resolve) => {
            try {
                const a = new Audio()
                const url = URL.createObjectURL(file)
                a.preload = "metadata"
                a.src = url
                a.onloadedmetadata = () => {
                    const d = Number.isFinite(a.duration) ? a.duration : undefined
                    URL.revokeObjectURL(url)
                    resolve(d)
                }
                a.onerror = () => {
                    URL.revokeObjectURL(url)
                    resolve(undefined)
                }
            } catch {
                resolve(undefined)
            }
        })
    }

    const uploadLocal = async (args: { file: File; title: string; artist: string; playlistId: string }) => {
        const { file, title, artist, playlistId } = args
        if (!userId) return
        const fileName = `${crypto.randomUUID()}_${sanitizeFilename(file.name)}`
        const path = `${userId}/${fileName}`

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "audio/mpeg",
        })
        if (upErr) {
            if (typeof upErr.message === "string" && upErr.message.toLowerCase().includes("bucket not found")) {
                alert(
                    `Bucket "${BUCKET}" tidak ditemukan.\n\nBuat bucket di Supabase Dashboard → Storage → Create bucket, beri nama "${BUCKET}" dan set Public (untuk setup cepat). Lalu coba upload lagi.\n\nAtau ubah env NEXT_PUBLIC_SUPABASE_BUCKET agar sesuai nama bucket kamu.`
                )
                return
            }
            alert(`Upload failed: ${upErr.message}`)
            return
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
        const publicUrl = pub.publicUrl

        const duration = await extractDuration(file)
        const { data: trk, error: insErr } = await supabase
            .from("tracks")
            .insert({
                user_id: userId,
                title,
                artist,
                file_path: path,
                public_url: publicUrl,
                mime_type: file.type || null,
                size: file.size || null,
                duration: duration || null,
            })
            .select("*")
            .single()
        if (insErr) {
            alert(`Failed to save track: ${insErr.message}`)
            return
        }
        const { error: linkErr } = await supabase.from("playlist_tracks").insert({
            playlist_id: playlistId,
            track_id: trk.id,
        })
        if (linkErr) {
            alert(`Failed to link track to playlist: ${linkErr.message}`)
            return
        }
        if (selectedPlaylistId === playlistId) {
            setTracks((prev) => [
                ...prev,
                {
                    id: trk.id,
                    title: trk.title,
                    artist: trk.artist,
                    src: trk.public_url,
                    cover: DEFAULT_COVER,
                    duration: trk.duration ?? undefined,
                    mimeType: trk.mime_type ?? undefined,
                    size: trk.size ?? undefined,
                    filePath: trk.file_path ?? undefined,
                },
            ])
        }
    }

    const onSignOut = async () => {
        await supabase.auth.signOut()
        router.replace("/login")
    }

    // Remove track only from current playlist (keep in library)
    const removeFromPlaylist = async (trackId: string) => {
        if (!selectedPlaylistId) return
        const { error } = await supabase
            .from("playlist_tracks")
            .delete()
            .eq("playlist_id", selectedPlaylistId)
            .eq("track_id", trackId)
        if (error) {
            alert(error.message)
            return
        }
        setTracks((prev) => {
            const idx = prev.findIndex((t) => t.id === trackId)
            const nextList = prev.filter((t) => t.id !== trackId)
            // Adjust current index if needed
            if (idx !== -1) {
                if (currentIndex > idx) setCurrentIndex(currentIndex - 1)
                else if (currentIndex === idx) {
                    if (nextList.length > idx) setCurrentIndex(idx)
                    else setCurrentIndex(Math.max(0, idx - 1))
                }
            }
            return nextList
        })
    }

    // Delete track entirely (from library and all playlists) + delete storage object
    const deleteTrackCompletely = async (trk: Track) => {
        try {
            // Try delete file first (ignore error)
            if (trk.filePath) {
                const { error: sErr } = await supabase.storage.from(BUCKET).remove([trk.filePath])
                if (sErr) {
                    // Not fatal; just log
                    console.warn("Storage remove error:", sErr.message)
                }
            }
            // Delete DB row (RLS ensures only owner can)
            const { error: dErr } = await supabase.from("tracks").delete().eq("id", trk.id)
            if (dErr) {
                alert(dErr.message)
                return
            }
            // Update UI
            setTracks((prev) => {
                const idx = prev.findIndex((t) => t.id === trk.id)
                const nextList = prev.filter((t) => t.id !== trk.id)
                if (idx !== -1) {
                    if (currentIndex > idx) setCurrentIndex(currentIndex - 1)
                    else if (currentIndex === idx) {
                        if (nextList.length > idx) setCurrentIndex(idx)
                        else setCurrentIndex(Math.max(0, idx - 1))
                    }
                }
                return nextList
            })
        } catch (e: any) {
            alert(e?.message ?? "Failed to delete track")
        }
    }

    const deletePlaylist = async (pl: Playlist) => {
        try {
            const { error } = await supabase.from("playlists").delete().eq("id", pl.id)
            if (error) {
                alert(error.message)
                return
            }
            // Update list
            setPlaylists((prev) => prev.filter((p) => p.id !== pl.id))
            if (selectedPlaylistId === pl.id) {
                // Switch to another playlist if available
                const remaining = playlists.filter((p) => p.id !== pl.id)
                const nextSel = remaining[0]?.id ?? null
                setSelectedPlaylistId(nextSel)
                setTracks([])
                setCurrentIndex(0)
            }
        } catch (e: any) {
            alert(e?.message ?? "Failed to delete playlist")
        }
    }

    const repeatIcon = repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />
    const volumeMuted = volume <= 0.001

    return (
        <LanguageProvider key={lang} initialLang={lang} onLangChange={setLang}>
            <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-6 md:pt-10">
                {/* Top Bar */}
                <div className="mb-6 flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
                        <Globe className="h-4 w-4" />
                        <LanguageSwitcher />
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle theme={theme} onThemeChange={setTheme} />
                        <Button variant="outline" className="gap-2" onClick={onSignOut}>
                            <LogOut className="h-4 w-4" />
                            {t("signOut")}
                        </Button>
                        <AddTrackDialog playlists={playlists} onUpload={uploadLocal} t={t} />
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="gap-2 md:hidden">
                                    <ListMusic className="h-4 w-4" />
                                    {t("playlist")}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[88vw] sm:w-[420px]">
                                <SheetHeader>
                                    <SheetTitle>{t("playlistsTitle")}</SheetTitle>
                                </SheetHeader>
                                <div className="mt-4">
                                    <PlaylistList
                                        playlists={playlists}
                                        selectedId={selectedPlaylistId}
                                        onSelect={(id) => setSelectedPlaylistId(id)}
                                        onCreate={createPlaylist}
                                        onDeletePlaylist={(pl) => setPlaylistToDelete(pl)}
                                        t={t}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr]">
                    {/* Left: Playlists */}
                    <Card className="hidden md:block">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ListMusic className="h-5 w-5" />
                                {t("playlistsTitle")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PlaylistList
                                playlists={playlists}
                                selectedId={selectedPlaylistId}
                                onSelect={(id) => setSelectedPlaylistId(id)}
                                onCreate={createPlaylist}
                                onDeletePlaylist={(pl) => setPlaylistToDelete(pl)}
                                t={t}
                            />
                        </CardContent>
                    </Card>

                    {/* Right: Now Playing + Tracks of selected playlist */}
                    <Card className="overflow-hidden">
                        <CardContent className="p-0">
                            <div className="grid gap-2 p-4 md:grid-cols-[260px_1fr] md:gap-6 md:p-6">
                                {/* Cover + Title */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative h-[260px] w-[260px] overflow-hidden rounded-xl shadow-md">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentTrack?.id || "no-track"}
                                                initial={{ opacity: 0.4, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                transition={{ duration: 0.25 }}
                                                className={cn("h-full w-full", isPlaying && "animate-[spin_18s_linear_infinite]")}
                                                style={{ willChange: "transform" }}
                                            >
                                                <img
                                                    src={currentTrack?.cover || DEFAULT_COVER}
                                                    alt={currentTrack ? `${currentTrack.title} cover` : "cover"}
                                                    className="absolute inset-0 h-full w-full object-cover"
                                                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                                                        e.currentTarget.src = DEFAULT_COVER
                                                    }}
                                                />
                                            </motion.div>
                                        </AnimatePresence>

                                        {loading && (
                                            <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-[2px]">
                                                <Loader2 className="h-8 w-8 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-semibold line-clamp-1">{currentTrack?.title || t("noTrack")}</div>
                                        <div className="text-sm text-muted-foreground line-clamp-1">{currentTrack?.artist || t("noArtist")}</div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex flex-col justify-between gap-4">
                                    {/* Progress */}
                                    <div className="grid gap-2">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="tabular-nums">{formatTime(currentTime)}</span>
                                            <div className="flex-1">
                                                <Slider value={duration ? currentTime : 0} max={Math.max(duration, 1)} step={0.1} onChange={(v) => seek(v)} aria-label={t("seek")} />
                                            </div>
                                            <span className="tabular-nums">{formatTime(duration)}</span>
                                        </div>
                                    </div>

                                    {/* Transport controls */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant={shuffle ? "default" : "ghost"}
                                                size="icon"
                                                onClick={toggleShuffle}
                                                className={cn(shuffle && "bg-primary text-primary-foreground")}
                                                aria-pressed={shuffle}
                                                aria-label={t("shuffle")}
                                            >
                                                <Shuffle className="h-5 w-5" />
                                            </Button>

                                            <Button variant="ghost" size="icon" onClick={prev} aria-label={t("prev")}>
                                                <SkipBack className="h-6 w-6" />
                                            </Button>

                                            <motion.button
                                                onClick={togglePlay}
                                                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                                whileTap={{ scale: 0.95 }}
                                                aria-label={isPlaying ? t("pause") : t("play")}
                                            >
                                                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                                            </motion.button>

                                            <Button variant="ghost" size="icon" onClick={next} aria-label={t("next")}>
                                                <SkipForward className="h-6 w-6" />
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant={repeat === "off" ? "ghost" : "default"} size="icon" aria-label={t("repeat")}>
                                                        {repeatIcon}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuLabel>{t("repeat")}</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setRepeatMode("off")}>{t("repeatOff")}</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setRepeatMode("all")}>{t("repeatAll")}</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setRepeatMode("one")}>{t("repeatOne")}</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* Volume */}
                                        <div className="flex items-center gap-3">
                                            <Button variant="ghost" size="icon" onClick={() => setVolume(volumeMuted ? 0.8 : 0)} aria-label={volumeMuted ? t("unmute") : t("mute")}>
                                                {volumeMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                            </Button>
                                            <Slider value={volume * 100} max={100} step={1} onChange={(v) => setVolume(v / 100)} className="max-w-[280px]" aria-label={t("volume")} />
                                        </div>
                                    </div>

                                    {lastError && currentTrack && (
                                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                            <div className="font-medium">{lastError}</div>
                                            <ul className="mt-1 text-xs text-destructive/90">
                                                <li>Source: {currentTrack.src}</li>
                                                <li>
                                                    Ext: {getExtension(currentTrack.src) || "(unknown)"} | MIME: {currentTrack.mimeType || "(unknown)"}
                                                </li>
                                                <li>Size: {humanSize(currentTrack.size)}</li>
                                            </ul>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">{t("tip")}</p>
                                </div>
                            </div>

                            {/* Track list of selected playlist */}
                            <div className="border-t p-4">
                                <div className="mb-2 text-sm font-medium">
                                    {t("playlist")} {selectedPlaylistId ? "" : `(${t("noPlaylistsYet")})`}
                                </div>
                                <div className="space-y-2">
                                    {tracks.map((trk, i) => (
                                        <div
                                            key={trk.id}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors",
                                                i === currentIndex && "bg-muted"
                                            )}
                                            aria-current={i === currentIndex ? "true" : "false"}
                                        >
                                            <button onClick={() => setCurrentIndex(i)} className="flex items-center gap-3 flex-1 text-left">
                                                <div className="relative h-12 w-12 overflow-hidden rounded">
                                                    <img
                                                        src={trk.cover || DEFAULT_COVER}
                                                        alt={`${trk.title} cover`}
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                        onError={(e: SyntheticEvent<HTMLImageElement>) => {
                                                            e.currentTarget.src = DEFAULT_COVER
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium leading-tight line-clamp-1">{trk.title}</div>
                                                    <div className="text-xs text-muted-foreground line-clamp-1">{trk.artist}</div>
                                                </div>
                                            </button>

                                            <div className="text-xs tabular-nums text-muted-foreground mr-1">{trk.duration ? formatTime(trk.duration) : t("unknown")}</div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" aria-label="Track actions">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>{t("playlist")}</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => removeFromPlaylist(trk.id)}>{t("removeFromPlaylist")}</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setTrackToDelete(trk)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t("deleteTrack")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))}
                                    {tracks.length === 0 && <div className="text-xs text-muted-foreground">{t("noTracksInPlaylist")}</div>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sticky mini player for small screens */}
                <div className="fixed inset-x-3 bottom-3 z-20 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/60 md:hidden">
                    <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-md">
                            <img
                                src={currentTrack?.cover || DEFAULT_COVER}
                                alt="cover"
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={(e: SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.src = DEFAULT_COVER
                                }}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{currentTrack?.title || t("noTrack")}</div>
                            <div className="truncate text-xs text-muted-foreground">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={prev} aria-label={t("prev")}>
                            <SkipBack className="h-5 w-5" />
                        </Button>
                        <Button className="h-10 w-10 rounded-full" onClick={togglePlay} aria-label={isPlaying ? t("pause") : t("play")}>
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={next} aria-label={t("next")}>
                            <SkipForward className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="mt-2 px-1">
                        <Slider value={duration ? currentTime : 0} max={Math.max(duration, 1)} step={0.1} onChange={(v) => seek(v)} aria-label={t("seek")} />
                    </div>
                </div>
            </div>

            {/* Confirm delete track */}
            <Dialog open={!!trackToDelete} onOpenChange={(open: boolean) => { if (!open) setTrackToDelete(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("confirmDeleteTrackTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">
                        {trackToDelete?.title} — {t("actionCannotBeUndone")}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTrackToDelete(null)}>
                            {t("cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (trackToDelete) {
                                    await deleteTrackCompletely(trackToDelete)
                                }
                                setTrackToDelete(null)
                            }}
                        >
                            {t("delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm delete playlist */}
            <Dialog open={!!playlistToDelete} onOpenChange={(open: boolean) => { if (!open) setPlaylistToDelete(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("confirmDeletePlaylistTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">
                        {playlistToDelete?.name} — {t("actionCannotBeUndone")}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPlaylistToDelete(null)}>
                            {t("cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (playlistToDelete) {
                                    await deletePlaylist(playlistToDelete)
                                }
                                setPlaylistToDelete(null)
                            }}
                        >
                            {t("delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </LanguageProvider>
    )
}
