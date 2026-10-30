import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, CircleAlert, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-subtle transition-colors outline-none hover:border-brand-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-100";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

/** Envuelve un control con etiqueta, ayuda y mensaje de error accesibles. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-soft">
        {label}
        {required && <span className="ml-0.5 text-accent-600" aria-hidden>*</span>}
      </label>
      {children(id, descId)}
      {error ? (
        <p id={descId} className="flex items-center gap-1.5 text-[13px] font-medium text-red-600" role="alert">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input"> & { icon?: ReactNode }>(function Input(
  { className, icon, ...props },
  ref,
) {
  if (!icon) return <input ref={ref} className={cn(control, "h-11", className)} {...props} />;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle">{icon}</span>
      <input ref={ref} className={cn(control, "h-11 pl-10", className)} {...props} />
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, "min-h-24 resize-y py-3", className)} {...props} />;
});

export function SearchBar({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
  label = "Buscar",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(control, "h-11 pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-canvas"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl py-1">
      <span>
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}
