"use client"

import * as React from "react"

type SimpleSliderProps = {
    value: number
    max: number
    step?: number
    onChange: (value: number) => void
    className?: string
    "aria-label"?: string
}

export function SimpleSlider({
    value,
    max,
    step = 1,
    onChange,
    className,
    "aria-label": ariaLabel,
}: SimpleSliderProps) {
    return (
        <input
            type="range"
            value={Number.isFinite(value) ? value : 0}
            max={Math.max(max, 0)}
            step={step}
            aria-label={ariaLabel}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
            className={
                className ??
                "w-full h-2 rounded-lg bg-muted accent-primary cursor-pointer"
            }
        />
    )
}
