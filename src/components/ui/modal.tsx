'use client';

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const Modal = ({ open, onOpenChange, children }: ModalProps) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      {children}
    </div>
  );
};

const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, children, size = "md", ...props }, ref) => {
    const sizes = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      full: "max-w-full mx-4",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative z-50 w-full rounded-lg bg-white shadow-xl",
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ModalContent.displayName = "ModalContent";

interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClose?: () => void;
}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, children, onClose, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between border-b border-secondary-200 px-6 py-4",
          className
        )}
        {...props}
      >
        <div className="flex-1">{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    );
  }
);
ModalHeader.displayName = "ModalHeader";

const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  return (
    <h2
      ref={ref}
      className={cn("text-xl font-semibold text-secondary-900", className)}
      {...props}
    >
      {children}
    </h2>
  );
});
ModalTitle.displayName = "ModalTitle";

const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("mt-1 text-sm text-secondary-600", className)}
      {...props}
    >
      {children}
    </p>
  );
});
ModalDescription.displayName = "ModalDescription";

const ModalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
});
ModalBody.displayName = "ModalBody";

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end gap-3 border-t border-secondary-200 px-6 py-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ModalFooter.displayName = "ModalFooter";

export {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
};

