export default function Header() {

    return (

        <header
            className="
                sticky
                top-0
                z-50
                border-b
                border-gray-200
                bg-white/90
                px-5
                py-4
                backdrop-blur
            "
        >

            <div>

                <h1
                    className="
                        text-lg
                        font-bold
                    "
                >
                    🎬 Video Controller
                </h1>

                <p
                    className="
                        text-xs
                        text-gray-500
                    "
                >
                    Remote Video Player
                </p>

            </div>

            {/* <div
                className="
                    flex
                    items-center
                    gap-2
                "
            >

                <div
                    className="
                        h-3
                        w-3
                        rounded-full
                        bg-red-500
                    "
                />

                <span
                    className="
                        text-xs
                        font-medium
                    "
                >
                    Offline
                </span>

            </div> */}

        </header>

    );

}