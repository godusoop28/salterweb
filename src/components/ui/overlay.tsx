"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert, X } from "lucide-react";
import { useHydrated } from "@/hooks/use-demo";
import { cn } from "@/lib/utils";
import { Button } from "./button";

function useOverlayBehavior(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], input, select, textarea, button:not([data-close])");
      focusable?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose, panelRef]);
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, description, icon, children, footer, size = "md" }: OverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const hydrated = useHydrated();
  useOverlayBehavior(open, onClose, ref);
  if (!open || !hydrated) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-navy/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-scale-in flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-3xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl",
          size === "xl" && "sm:max-w-5xl",
        )}
      >
        <header className="flex items-start gap-3 border-b border-line-soft px-6 py-5">
          {icon && <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </header>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line-soft bg-canvas/60 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, description, icon, children, footer, size = "md" }: OverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const hydrated = useHydrated();
  useOverlayBehavior(open, onClose, ref);
  if (!open || !hydrated) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-navy/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex h-full w-full animate-slide-in-right flex-col bg-white shadow-pop",
          size === "sm" && "max-w-md",
          size === "md" && "max-w-xl",
          (size === "lg" || size === "xl") && "max-w-2xl",
        )}
      >
        <header className="flex items-start gap-3 border-b border-line-soft px-6 py-5">
          {icon && <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label="Cerrar panel">
            <X className="size-5" />
          </button>
        </header>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line-soft px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      icon={<TriangleAlert className={cn("size-5", tone === "danger" ? "text-red-600" : "text-accent-600")} />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-ink-soft">{description}</p>
    </Modal>
  );
}
