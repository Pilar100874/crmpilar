import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "atendimento_rascunho:";

function readDraft<T>(key: string | undefined, fallback: T): T {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(`${PREFIX}${key}`);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function usePersistentDraft<T>(key: string | undefined, fallback: T) {
  const [value, setValueState] = useState<T>(() => readDraft(key, fallback));
  const activeKeyRef = useRef(key);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    activeKeyRef.current = key;
    setValueState(readDraft(key, fallbackRef.current));
  }, [key]);

  const setValue: Dispatch<SetStateAction<T>> = useCallback((next) => {
    setValueState((current) => {
      const resolved = typeof next === "function"
        ? (next as (previous: T) => T)(current)
        : next;
      const activeKey = activeKeyRef.current;
      if (activeKey && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(`${PREFIX}${activeKey}`, JSON.stringify(resolved));
        } catch {
          // O rascunho continua disponível nesta sessão quando o navegador recusa armazenamento.
        }
      }
      return resolved;
    });
  }, []);

  const clear = useCallback(() => {
    const activeKey = activeKeyRef.current;
    if (activeKey && typeof window !== "undefined") {
      window.localStorage.removeItem(`${PREFIX}${activeKey}`);
    }
    setValueState(fallbackRef.current);
  }, []);

  return [value, setValue, clear] as const;
}
