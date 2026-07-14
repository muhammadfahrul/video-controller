import { NavLink } from "react-router-dom";
import { Home, ListMusic, Search, Settings } from "lucide-react";

export default function Header() {

    const navItems = [
        {
            path: "/",
            label: "Home",
            icon: Home
        },
        {
            path: "/queue",
            label: "Playlist",
            icon: ListMusic
        },
        {
            path: "/search",
            label: "Search",
            icon: Search
        },
        {
            path: "/settings",
            label: "Settings",
            icon: Settings
        }
    ];

    return (

        <header
            className="
                sticky
                top-0
                z-50
                border-b
                border-gray-200
                bg-white/90
                px-4
                py-3
                backdrop-blur
            "
        >

            {/* <div className="flex items-center justify-between mb-3">

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

            </div> */}

            <nav
                className="
                    flex
                    justify-between
                    bg-gray-100
                    rounded-lg
                    p-1
                "
            >

                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-1 px-3 py-2 rounded-md text-sm transition-colors ${
                                isActive
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                            }`
                        }
                    >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}

            </nav>

        </header>

    );

}