import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Runs `fn` now and every `intervalMs` while the screen is focused. Messages
 * have no push channel (RLS keeps the anon key out of Realtime, and everything
 * goes through Express), so polling is how new ones show up. A slow request
 * never overlaps the next tick.
 */
export function usePolling(fn: () => Promise<unknown>, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let inFlight = false;
      const tick = async () => {
        if (inFlight) return;
        inFlight = true;
        try {
          await fnRef.current();
        } finally {
          inFlight = false;
        }
      };
      tick();
      const timer = setInterval(tick, intervalMs);
      return () => clearInterval(timer);
    }, [intervalMs, enabled])
  );
}
