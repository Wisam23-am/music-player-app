"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n"

const LANGS = [
    { code: "en", label: "English" },
    { code: "id", label: "Indonesia" },
    { code: "zh", label: "中文" },
    { code: "ja", label: "日本語" },
] as const

export function LanguageSwitcher() {
    const { lang, setLang, t } = useI18n()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-2">
                    {LANGS.find(l => l.code === lang)?.label ?? "Language"}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LANGS.map(l => (
                    <DropdownMenuItem key={l.code} onClick={() => setLang(l.code as any)}>
                        {l.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
