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