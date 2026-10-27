import { Alert, Platform } from "react-native";

/** Alert.alert is a no-op on react-native-web, so web falls back to window.alert. */
export function showError(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
