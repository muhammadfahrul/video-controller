export function getServerUrl(): string {
  return import.meta.env.VITE_API_URL || window.location.hostname + ":3000";
}
