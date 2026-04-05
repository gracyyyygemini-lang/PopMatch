export function isBackendMvpEnabled(): boolean {
  return process.env.EXPO_PUBLIC_BACKEND_MVP === "1";
}
