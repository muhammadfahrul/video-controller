import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface Props {
    icon: ReactNode;
    label: string;
    onClick?(): void;
    variant?: "primary" | "secondary" | "danger";
    disabled: boolean;
    loading?: boolean;
}

export default function ControlButton({ icon, label, onClick, variant = "secondary", disabled, loading = false }: Props) {
    const styles = {
        primary: "bg-teal-300 text-slate-950 hover:bg-teal-200 shadow-lg shadow-teal-400/20",
        secondary: "bg-white/[0.07] text-slate-100 hover:bg-white/[0.12]",
        danger: "bg-rose-400/10 text-rose-300 hover:bg-rose-400/20"
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            className={`flex min-h-[88px] w-full flex-col items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center text-sm transition-all duration-200 active:scale-[0.97] ${styles[variant]} ${disabled || loading ? "cursor-not-allowed opacity-45" : ""}`}
        >
            {loading ? <Loader2 className="animate-spin" size={24} /> : icon}
            <span className="text-sm font-semibold">{label}</span>
        </button>
    );
}
