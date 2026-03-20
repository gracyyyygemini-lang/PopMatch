import { Redirect } from "expo-router";
import { useAppContext } from "../context/AppContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, isLoading } = useAppContext();

  // If we are still checking the session, show a clean loading state
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FBFBF9",
        }}
      >
        <ActivityIndicator size="large" color="#FF8C69" />
      </View>
    );
  }

  // If a session exists, go to the app.
  // AppContext will handle fetching the profile details.
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  // No session? Go to login.
  return <Redirect href="/onboarding" />;
}
