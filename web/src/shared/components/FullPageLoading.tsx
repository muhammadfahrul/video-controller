import { Loader2 } from "lucide-react";

import { useEffect, useState } from "react";

interface FullPageLoadingProps {
    message?: string;
    duration?: number; // Custom duration in ms. If not provided, stays until manually hidden
}

export default function FullPageLoading({ 
    message = "Processing...",
    duration 
}: FullPageLoadingProps) {
    const [show, setShow] = useState(true);

    useEffect(() => {
        // If duration is provided, auto-hide after duration
        if (duration !== undefined && duration > 0) {
            const timer = setTimeout(() => {
                setShow(false);
            }, duration);
            return () => clearTimeout(timer);
        }
        // If no duration, stay visible until manually hidden
    }, [duration]);

    if (!show) return null;

    return (

        <div
            className="
                fixed
                inset-0
                z-100
                flex
                items-center
                justify-center
                bg-black/50
                backdrop-blur-sm
            "
        >

            <div
                className="
                    flex
                    flex-col
                    items-center
                    gap-4
                    rounded-xl
                    bg-[#12121f]
                    p-8
                    shadow-2xl
                "
            >

                <Loader2
                    className="
                        h-12
                        w-12
                        animate-spin
                        text-blue-600
                    "
                />

                <p
                    className="
                        text-lg
                        font-medium
                        text-white
                    "
                >

                    {message}

                </p>

            </div>

        </div>

    );

}
