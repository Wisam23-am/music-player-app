"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Moon, Sun, Monitor } from 'lucide-react'

export function ThemeToggle({
    theme,
    onThemeChange,
}: {
    theme: "light" | "dark" | "system"
    onThemeChange: (t: "light" | "dark" | "system") => void
}) {
    const { setTheme } = useTheme()

    const select = (t: "light" | "dark" | "system") => {
        setTheme(t)
        onThemeChange(t)
    }

    const icon =
        theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                    {icon}
                    <span className="hidden sm:inline">{theme === "system" ? "System" : theme[0].toUpperCase() + theme.slice(1)}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => select("light")}>
                    <Sun className="mr-2 h-4 w-4" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => select("dark")}>
                    <Moon className="mr-2 h-4 w-4" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => select("system")}>
                    <Monitor className="mr-2 h-4 w-4" /> System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
