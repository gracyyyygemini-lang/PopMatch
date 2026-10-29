import { Alert, Platform } from "react-native";

/** Alert.alert is a no-op on react-native-web, so web falls back to window.alert. */
export function showError(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

/**
 * Cancel / confirm dialog that works on web too. Resolves true on confirm.
 * The confirm button is destructive (red on iOS) unless `destructive` is false.
 */
export function confirmAction(title: string, message: string, confirmLabel: string, destructive = true): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
