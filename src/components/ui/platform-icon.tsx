"use client";

import { cn } from "@/lib/utils";
import { Instagram, Facebook, Twitter, Linkedin, Youtube, PlaySquare } from "lucide-react";

type Props = {
  platform: string;
  className?: string;
};

export function PlatformIcon({ platform, className }: Props) {
  const p = (platform || '').toLowerCase();
  const common = cn("inline-block", className);
  switch (p) {
    case "instagram":
      return <Instagram className={common} />;
    case "facebook":
      return <Facebook className={common} />;
    case "twitter":
    case "x":
      return <Twitter className={common} />;
    case "linkedin":
      return <Linkedin className={common} />;
    case "youtube":
      return <Youtube className={common} />;
    case "tiktok":
      return <PlaySquare className={common} />;
    default:
      return <span className={common}>{platform}</span>;
  }
}

