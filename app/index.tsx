import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChange, type User } from "@/lib/auth";
import { useApp } from "@/context/AppContext";

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOnboarded } = useApp();

  useEffect(() => {
    // Fires immediately with the restored session (or null), which is what
    // clears the loading state.
    const unsubscribe = onAuthStateChange((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) return null;

  if (!user) {
    return <Redirect href="/onboarding" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
