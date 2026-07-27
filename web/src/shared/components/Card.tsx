import type { ReactNode } from "react";

interface Props {
    children: ReactNode;
    className?: string;
    onClick?(): void;
}

export default function Card({ children, className = "", onClick }: Props) {
    return (
        <div onClick={onClick} className={`glass-card rounded-2xl border p-4 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}>
            {children}
        </div>
    );
}
