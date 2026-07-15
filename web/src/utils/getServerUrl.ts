export function getServerUrl(): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Development: Vite typically runs on 5173, API server on 3000
  // Preview: Vite preview runs on 4173, API server on 3000
  // If current port is 5173/5174 (dev) or 4173 (preview), use 3000 for API
  const devPorts = ["5173", "5174", "4173", "4174"];
  const apiPort = devPorts.includes(port) ? "3000" : (port || "3000");
  
  return `${protocol}//${hostname}:${apiPort}`;
}
