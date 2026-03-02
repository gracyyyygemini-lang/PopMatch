import { Redirect } from "expo-router";
import { useApp } from "@/context/AppContext";

export default function Index() {
  const { isOnboarded, isLoaded } = useApp();
  if (!isLoaded) return null;
  if (isOnboarded) return <Redirect href="/(tabs)" />;
  return <Redirect href="/onboarding" />;
}
