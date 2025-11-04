import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  return <div className="relative inline-block text-left">{children}</div>;
};

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({
  children,
  asChild,
}) => {
  return <>{children}</>;
};

interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  align = "end",
  className,
}) => {
  const alignClass = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border border-secondary-200 bg-white p-1 shadow-md",
        alignClass[align],
        className
      )}
    >
      {children}
    </div>
  );
};

interface DropdownMenuItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
}

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(({ className, disabled, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-secondary-100 focus:bg-secondary-100",
      disabled && "pointer-events-none opacity-50",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
);

const DropdownMenuSeparator: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => (
  <div
    className={cn("-mx-1 my-1 h-px bg-secondary-200", className)}
    {...props}
  />
);

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};

