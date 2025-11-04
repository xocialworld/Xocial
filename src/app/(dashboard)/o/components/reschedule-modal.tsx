'use client';

import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  onReschedule: (newDate: Date, newTime: string) => void;
}

export function RescheduleModal({
  open,
  onOpenChange,
  currentDate,
  onReschedule,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(currentDate);
  const [selectedTime, setSelectedTime] = React.useState(
    format(currentDate, 'HH:mm')
  );

  const handleReschedule = () => {
    onReschedule(selectedDate, selectedTime);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <ModalHeader onClose={() => onOpenChange(false)}>
          <ModalTitle>Reschedule Post</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                New Date
              </label>
              <DatePicker
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                minDate={new Date()}
              />
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-secondary-900 mb-2">
                Time
              </label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-secondary-50 p-4">
              <p className="text-sm text-secondary-700">
                <strong>New schedule:</strong>{' '}
                {format(selectedDate, 'MMMM d, yyyy')} at {selectedTime}
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReschedule}>
            Reschedule
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

