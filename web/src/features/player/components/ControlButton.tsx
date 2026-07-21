import type {

    ReactNode

} from "react";

import {

    Loader2

} from "lucide-react";

interface Props {

    icon: ReactNode;

    label: string;

    onClick?(): void;

    variant?:
        | "primary"
        | "secondary"
        | "danger";

    disabled: boolean;

    loading?: boolean;

}

export default function ControlButton({

    icon,

    label,

    onClick,

    variant = "secondary",

    disabled = false,

    loading = false

}: Props) {

    const styles = {

        primary:
            "bg-[#ff2d95] text-white hover:bg-[#ff4da6] shadow-[0_0_15px_rgba(255,45,149,0.5)]",

        secondary:
            "bg-[#1a1a2e] text-[#00f0ff] hover:bg-[#252542] shadow-[0_0_10px_rgba(0,240,255,0.3)]",

        danger:
            "bg-[#1a1a2e] text-red-400 hover:bg-[#252542]"

    };

    return (

        <button

            onClick={onClick}

            className={`
                flex
                flex-col
                items-center
                justify-center
                gap-2
                rounded-xl
                p-4
                transition
                ${styles[variant]}
                ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
            `}

            disabled={disabled || loading}

        >

            {loading ? (
                <Loader2 
                    className="animate-spin" 
                    size={24} 
                />
            ) : icon}

            <span
                className="
                    text-xs
                    font-medium
                "
            >

                {label}

            </span>

        </button>

    );

}