"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
    HTMLInputElement,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
        value: number[]
        onValueChange: (value: number[]) => void
        min?: number
        max?: number
        step?: number
    }
>(({ className, min = 0, max = 100, step = 1, value, onValueChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange([parseFloat(e.target.value)])
    }

    const val = value[0] ?? min
    const percentage = ((val - min) / (max - min)) * 100

    return (
        <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
            <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
                <div
                    className="absolute h-full bg-primary"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={handleChange}
                ref={ref}
                className="absolute h-full w-full opacity-0 cursor-pointer"
                {...props}
            />
            <div
                className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                style={{ left: `calc(${percentage}% - 10px)` }}
            />
        </div>
    )
})
Slider.displayName = "Slider"

export { Slider }
