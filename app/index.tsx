import { Redirect } from "expo-router";
import { useApp } from "@/context/AppContext";

export default function Index() {
  const { isOnboarded, isLoaded, languageSelected } = useApp();
  if (!isLoaded) return null;
  if (!languageSelected) return <Redirect href="/language-select" />;
  if (isOnboarded) return <Redirect href="/(tabs)" />;
  return <Redirect href="/onboarding" />;
}
