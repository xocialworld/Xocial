'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4">
          <ol className="flex items-center gap-2 text-sm text-secondary-600">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-secondary-900 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-secondary-900 font-medium">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-secondary-900">{title}</h1>
          {description && (
            <p className="mt-2 text-secondary-600">{description}</p>
          )}
        </div>
        
        {/* Actions */}
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

