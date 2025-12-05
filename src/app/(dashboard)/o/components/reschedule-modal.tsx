import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; // Assuming this exists from shadcn
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  onReschedule: (date: Date, time: string) => void;
}

export function RescheduleModal({
  open,
  onOpenChange,
  currentDate,
  onReschedule,
}: RescheduleModalProps) {
  const [date, setDate] = useState<Date | undefined>(currentDate);
  const [time, setTime] = useState(format(currentDate, "HH:mm"));

  const handleSave = () => {
    if (date && time) {
      onReschedule(date, time);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reschedule Post</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Date</Label>
            <div className="border rounded-md p-2 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
