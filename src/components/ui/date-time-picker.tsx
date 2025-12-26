"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
    date?: Date
    setDate: (date?: Date) => void
}

export function DateTimePicker({ date, setDate }: DateTimePickerProps) {
    const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(
        date
    )

    React.useEffect(() => {
        if (date) {
            setSelectedDateTime(date);
        }
    }, [date])

    const handleSelect = (day: Date | undefined) => {
        if (!day) {
            setDate(undefined);
            return;
        }
        const newDate = new Date(day);
        if (selectedDateTime) {
            newDate.setHours(selectedDateTime.getHours());
            newDate.setMinutes(selectedDateTime.getMinutes());
        }
        setDate(newDate);
        setSelectedDateTime(newDate);
    }

    const handleTimeChange = (type: "hour" | "minute", value: string) => {
        if (!selectedDateTime) return;
        const newDate = new Date(selectedDateTime);
        if (type === "hour") {
            newDate.setHours(parseInt(value));
        } else if (type === "minute") {
            newDate.setMinutes(parseInt(value));
        }
        setDate(newDate);
        setSelectedDateTime(newDate);
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP p") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDateTime}
                    onSelect={handleSelect}
                    initialFocus
                />
                <div className="p-3 border-t flex flex-col gap-2">
                    <Label>Time</Label>
                    <div className="flex gap-2">
                        <Select
                            disabled={!selectedDateTime}
                            value={selectedDateTime ? selectedDateTime.getHours().toString() : undefined}
                            onValueChange={(val) => handleTimeChange("hour", val)}
                        >
                            <SelectTrigger className="w-[110px]">
                                <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                    <SelectItem key={hour} value={hour.toString()}>
                                        {hour.toString().padStart(2, '0')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            disabled={!selectedDateTime}
                            value={selectedDateTime ? selectedDateTime.getMinutes().toString() : undefined}
                            onValueChange={(val) => handleTimeChange("minute", val)}
                        >
                            <SelectTrigger className="w-[110px]">
                                <SelectValue placeholder="Minute" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                                    <SelectItem key={minute} value={minute.toString()}>
                                        {minute.toString().padStart(2, '0')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
