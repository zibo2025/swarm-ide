import { useEffect, useRef, type MutableRefObject } from "react";

/** Create a ref and keep it in sync with a reactive value. */
export function useSyncRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

/** Sync an existing ref to a reactive value each render cycle. */
export function useSyncToRef<T>(ref: MutableRefObject<T>, value: T): void {
  useEffect(() => {
    ref.current = value;
  }, [ref, value]);
}
