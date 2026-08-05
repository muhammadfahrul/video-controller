import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface Props extends ComponentPropsWithoutRef<"div"> {
    children: ReactNode;
    className?: string;
}

export default function Card({ children, className = "", onClick, ...rest }: Props) {
    return (
        <div
            onClick={onClick}
            className={`glass-card rounded-2xl border p-4 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
}
