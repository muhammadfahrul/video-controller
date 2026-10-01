import type {

    ReactNode

} from "react";


interface Props {

    children: ReactNode;

    className?: string;

    onClick?(): void;

}


export default function Card({

    children,

    className = "",

    onClick

}: Props) {


    return (

        <div

            onClick={onClick}

            className={`
                rounded-2xl
                border
                border-[#2a2a4a]
                bg-[#12121f]
                p-4
                shadow-[0_0_15px_rgba(168,85,247,0.1)]
                hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]
                transition-all
                ${className}
            `}

        >

            {children}

        </div>

    );

}