import type {

    ReactNode

} from "react";

interface Props {

    icon: ReactNode;

    label: string;

    onClick?(): void;

    variant?:
        | "primary"
        | "secondary"
        | "danger";

    disabled: boolean;

}

export default function ControlButton({

    icon,

    label,

    onClick,

    variant = "secondary",

    disabled = false

}: Props) {

    const styles = {

        primary:
            "bg-red-600 text-white hover:bg-red-700",

        secondary:
            "bg-gray-100 hover:bg-gray-200",

        danger:
            "bg-red-100 text-red-600 hover:bg-red-200"

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
            `}

            disabled={disabled}

        >

            {icon}

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