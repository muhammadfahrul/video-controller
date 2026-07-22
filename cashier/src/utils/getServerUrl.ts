export function getServerUrl(): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Cashier app runs on 53334 (dev) or 53335 (preview), API server on 53331
  const cashierPorts = ["53334", "53335"];
  const apiPort = cashierPorts.includes(port) ? "53331" : (port || "53331");
  
  return `${protocol}//${hostname}:${apiPort}`;
}
