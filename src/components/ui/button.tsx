import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-xl transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-accent-600 text-white shadow-[0_6px_16px_-6px_rgb(227_93_0/0.6)] hover:bg-accent-700",
  secondary: "bg-brand-500 text-white shadow-[0_6px_16px_-6px_rgb(11_92_213/0.55)] hover:bg-brand-600",
  outline: "border border-line bg-white text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
  ghost: "text-ink-soft hover:bg-brand-50 hover:text-brand-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-13 px-6 text-base",
  icon: "h-10 w-10",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function buttonClass({ variant = "primary", size = "md" }: StyleProps, className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  icon,
  iconRight,
  loading,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps & { loading?: boolean }) {
  return (
    <button type={type} className={buttonClass({ variant, size }, className)} disabled={loading || props.disabled} {...props}>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return (
    <Link className={buttonClass({ variant, size }, className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
