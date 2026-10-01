export function getServerUrl(): string {
  const protocol = window.location.protocol;
  const hostname = import.meta.env.VITE_SERVER_IP || window.location.hostname;

  // VITE_SERVER_PORT is an explicit operator override (see web/.env.example).
  // If not set, fall back to the dev/preview-port heuristic.
  const configuredPort = import.meta.env.VITE_SERVER_PORT;
  if (configuredPort) {
    return `${protocol}//${hostname}:${configuredPort}`;
  }

  const port = window.location.port;

  // Development: Vite typically runs on 53332, API server on 53331
  // Preview: Vite preview runs on 53333, API server on 53331
  // If current port is 53332 (dev) or 53333 (preview), use 53331 for API
  const devPorts = ["53332", "53333"];
  const apiPort = devPorts.includes(port) ? "53331" : (port || "53331");

  return `${protocol}//${hostname}:${apiPort}`;
}
