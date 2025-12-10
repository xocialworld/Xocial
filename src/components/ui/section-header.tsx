import { cn } from "@/lib/utils"

interface SectionHeaderProps {
    title: string
    subtitle?: string
    description?: string
    align?: "left" | "center" | "right"
    className?: string
    badge?: string
    badgeVariant?: "default" | "primary" | "secondary" | "purple" | "indigo" | "blue" | "pink" | "orange"
    gradient?: boolean
}

export function SectionHeader({
    title,
    subtitle,
    description,
    align = "center",
    className,
    badge,
    badgeVariant = "default",
    gradient = false,
}: SectionHeaderProps) {
    const alignment = {
        left: "text-left",
        center: "text-center mx-auto",
        right: "text-right ml-auto",
    }

    const badgeColors = {
        default: "bg-secondary-100 text-secondary-700",
        primary: "bg-primary-100 text-primary-700",
        secondary: "bg-secondary-100 text-secondary-700",
        purple: "bg-purple-100 text-purple-700",
        indigo: "bg-indigo-100 text-indigo-700",
        blue: "bg-blue-100 text-blue-700",
        pink: "bg-pink-100 text-pink-700",
        orange: "bg-orange-100 text-orange-700",
    }

    return (
        <div className={cn("max-w-3xl mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700", alignment[align], className)}>
            {badge && (
                <div className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-medium mb-6", badgeColors[badgeVariant])}>
                    {badge}
                </div>
            )}
            {subtitle && (
                <p className="text-sm font-semibold leading-7 text-primary-600 uppercase tracking-wide mb-3">
                    {subtitle}
                </p>
            )}
            <h2 className={cn("text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl mb-4", gradient && "text-transparent bg-clip-text bg-gradient-to-r from-secondary-900 to-secondary-600")}>
                {title}
            </h2>
            {description && (
                <p className="text-lg leading-8 text-secondary-600">
                    {description}
                </p>
            )}
        </div>
    )
}
