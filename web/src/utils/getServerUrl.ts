export function getServerUrl(): string {
  const protocol = window.location.protocol;
  const hostname = import.meta.env.VITE_SERVER_IP || window.location.hostname;
  
  // Always use configured server port from .env, with fallback to 53331
  // This ensures predictable API endpoint regardless of UI server port
  const configuredPort = import.meta.env.VITE_SERVER_PORT || "53331";
  
  return `${protocol}//${hostname}:${configuredPort}`;
}
