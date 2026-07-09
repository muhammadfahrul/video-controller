import type { ReactNode } from "react";

interface Props {

    children: ReactNode;

    className?: string;

}

export default function Card({

    children,

    className = ""

}: Props) {

    return (

        <div
            className={`
                rounded-2xl
                border
                border-gray-200
                bg-white
                p-4
                shadow-sm
                ${className}
            `}
        >

            {children}

        </div>

    );

}