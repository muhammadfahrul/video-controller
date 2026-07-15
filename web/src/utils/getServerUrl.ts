export function getServerUrl(): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Development: Vite typically runs on 5173, API server on 3000
  // If current port is 5173 (dev server), use 3000 for API
  // Otherwise use current port (production)
  const apiPort = (port === "5173" || port === "5174") ? "3000" : (port || "3000");
  
  return `${protocol}//${hostname}:${apiPort}`;
}
