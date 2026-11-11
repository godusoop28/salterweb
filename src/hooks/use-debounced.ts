"use client";

import { useEffect, useState } from "react";

/** Devuelve el valor sólo cuando deja de cambiar durante `ms` (evita una consulta por cada tecla). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
