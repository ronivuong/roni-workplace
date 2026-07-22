"use client";

import {
  SiWordpress,
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiYoutube,
  SiThreads,
} from "react-icons/si";
import { HiOutlineGlobeAlt } from "react-icons/hi2";
import { cn } from "@/lib/utils";

const BRAND: Record<
  string,
  {
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
    bg: string;
  }
> = {
  wordpress: { Icon: SiWordpress, color: "#FFFFFF", bg: "#21759B" },
  facebook: { Icon: SiFacebook, color: "#FFFFFF", bg: "#1877F2" },
  instagram: { Icon: SiInstagram, color: "#FFFFFF", bg: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" },
  tiktok: { Icon: SiTiktok, color: "#FFFFFF", bg: "#000000" },
  youtube: { Icon: SiYoutube, color: "#FFFFFF", bg: "#FF0000" },
  threads: { Icon: SiThreads, color: "#FFFFFF", bg: "#000000" },
  blog: { Icon: HiOutlineGlobeAlt, color: "#FFFFFF", bg: "#10B981" },
  social: { Icon: HiOutlineGlobeAlt, color: "#FFFFFF", bg: "#6366F1" },
};

export function PlatformIcon({
  platform,
  size = "md",
  className,
  mono = false,
}: {
  platform: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** White icon only, no brand background (for dark/colored parents) */
  mono?: boolean;
}) {
  const key = (platform || "blog").toLowerCase();
  const brand = BRAND[key] || BRAND.blog;
  const { Icon } = brand;

  const box =
    size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-12 w-12 rounded-xl" : "h-11 w-11 rounded-xl";
  const icon =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  if (mono) {
    return <Icon className={cn(icon, className)} />;
  }

  const isGradient = brand.bg.includes("gradient");

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center shadow-sm",
        box,
        className
      )}
      style={
        isGradient
          ? { background: brand.bg }
          : { backgroundColor: brand.bg }
      }
      title={key}
    >
      <Icon className={icon} style={{ color: brand.color }} />
    </div>
  );
}

export function PlatformIconInline({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const key = (platform || "blog").toLowerCase();
  const brand = BRAND[key] || BRAND.blog;
  const { Icon } = brand;
  // For inline, use brand color on transparent bg
  const fill =
    key === "instagram"
      ? "#E4405F"
      : key === "wordpress"
        ? "#21759B"
        : key === "facebook"
          ? "#1877F2"
          : key === "youtube"
            ? "#FF0000"
            : key === "tiktok" || key === "threads"
              ? "#111111"
              : "#10B981";

  return <Icon className={cn("h-4 w-4", className)} style={{ color: fill }} />;
}

export function platformBrandColor(platform: string) {
  const key = (platform || "").toLowerCase();
  if (key === "instagram") return "#E4405F";
  if (key === "wordpress") return "#21759B";
  if (key === "facebook") return "#1877F2";
  if (key === "youtube") return "#FF0000";
  if (key === "tiktok" || key === "threads") return "#000000";
  if (key === "blog") return "#10B981";
  return "#64748B";
}
