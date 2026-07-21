import { Loader2 } from "lucide-react";

export default function FullPageLoading() {

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

                    Processing...

                </p>

            </div>

        </div>

    );

}
