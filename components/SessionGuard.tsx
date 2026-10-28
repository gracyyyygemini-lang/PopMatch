import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { onSignInRequired } from "@/lib/query-client";
import { showError } from "@/lib/alert";
import { supabase } from "@/lib/supabase";

/**
 * When the API says the session is gone for good (apiRequest already tried a
 * refresh), tell the student and send them to sign in. Onboarding keeps the
 * profile, so signing back in returns them home. Renders nothing.
 */
export function SessionGuard() {
  const { isOnboarded } = useApp();
  const onboarded = useRef(isOnboarded);
  onboarded.current = isOnboarded;

  useEffect(() => {
    let handling = false;
    return onSignInRequired(() => {
      // Before onboarding finishes the student is on the sign-in screen
      // already; and several requests failing at once should alert once.
      if (!onboarded.current || handling) return;
      handling = true;
      supabase.auth.signOut({ scope: "local" })
        .catch(error => console.error("[auth] Clearing the dead session failed:", error))
        .finally(() => {
          showError("Please sign in again", "Your session ended. Sign in with your @illinois.edu email to pick up where you left off.");
          router.replace("/onboarding");
          setTimeout(() => { handling = false; }, 5000);
        });
    });
  }, []);

  return null;
}
