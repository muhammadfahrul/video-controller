import { MonitorSmartphone, Network, Router, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";
import AgentStatusCard from "../features/agent/components/AgentStatusCard";

type BrowserConnection = {
    effectiveType?: string;
    type?: string;
    downlink?: number;
    addEventListener?: (event: "change", listener: () => void) => void;
    removeEventListener?: (event: "change", listener: () => void) => void;
};

type NetworkState = {
    online: boolean;
    label: string;
    detail: string;
};

function getNetworkState(): NetworkState {
    const connection = (navigator as Navigator & { connection?: BrowserConnection }).connection;
    const connectionType = connection?.type ?? connection?.effectiveType;
    const label = connectionType === "wifi" ? "Wi-Fi" : connectionType?.toUpperCase() || "Jaringan tidak terdeteksi";
    const speed = connection?.downlink ? ` • hingga ${connection.downlink} Mbps` : "";

    return {
        online: navigator.onLine,
        label,
        detail: navigator.onLine ? `Terhubung${speed}` : "Tidak ada koneksi internet"
    };
}

function getBrowserDeviceName(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("android")) return "Tablet Android";
    if (userAgent.includes("ipad")) return "iPad";
    if (userAgent.includes("iphone")) return "iPhone";
    return "Perangkat kontrol";
}

export default function SettingsPage() {
    const { agent } = useAppStore();
    const [network, setNetwork] = useState(getNetworkState);

    useEffect(() => {
        const connection = (navigator as Navigator & { connection?: BrowserConnection }).connection;
        const updateNetwork = () => setNetwork(getNetworkState());

        window.addEventListener("online", updateNetwork);
        window.addEventListener("offline", updateNetwork);
        connection?.addEventListener?.("change", updateNetwork);

        return () => {
            window.removeEventListener("online", updateNetwork);
            window.removeEventListener("offline", updateNetwork);
            connection?.removeEventListener?.("change", updateNetwork);
        };
    }, []);

    const deviceName = agent.name || getBrowserDeviceName();
    const connectionHost = window.location.hostname || "Tidak tersedia";

    return (
        <div className="space-y-5 tablet-landscape-text">
            <p className="text-sm text-slate-400 tablet-landscape-text">Informasi perangkat karaoke dan jaringan yang sedang digunakan.</p>

            <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <h2 className="mb-4 font-semibold text-white">Perangkat karaoke</h2>
                <AgentStatusCard
                    agent={{
                        id: agent.id,
                        name: deviceName,
                        status: agent.online ? "ONLINE" : "OFFLINE",
                        lastHeartbeat: agent.lastHeartbeat,
                        isActive: agent.online
                    }}
                />
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <h2 className="mb-3 font-semibold text-white">Koneksi perangkat</h2>
                <div className="divide-y divide-white/8">
                    <InfoRow icon={<MonitorSmartphone size={19} />} label="Nama perangkat" value={deviceName} />
                    <InfoRow icon={<Router size={19} />} label="IP / host perangkat" value={connectionHost} />
                    <InfoRow
                        icon={network.online ? <Wifi size={19} /> : <Network size={19} />}
                        label="Jaringan yang digunakan"
                        value={network.label}
                        detail={network.detail}
                        online={network.online}
                    />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">Nama Wi-Fi dan alamat IP lokal agent tidak dapat dibaca langsung oleh browser. Informasi di atas menampilkan koneksi aktif dari perangkat kontrol.</p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
                <h2 className="mb-2 font-semibold text-white tablet-landscape-heading">ABOUT</h2>
                <p className="text-sm text-slate-400 tablet-landscape-text">Gunakan tablet ini untuk memilih lagu, mengatur antrean, dan mengontrol pemutaran di ruangan karaoke.</p>
                <p className="mt-3 text-xs text-teal-200 tablet-landscape-text">Version 1.0.0</p>
            </section>
        </div>
    );
}

function InfoRow({ icon, label, value, detail, online }: { icon: React.ReactNode; label: string; value: string; detail?: string; online?: boolean }) {
    return (
        <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${online === false ? "bg-rose-400/10 text-rose-200" : "bg-teal-300/10 text-teal-200"}`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="truncate text-sm font-medium text-white">{value}</p>
                {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
            </div>
        </div>
    );
}
