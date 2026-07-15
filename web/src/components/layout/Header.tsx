import { NavLink, useLocation } from "react-router-dom";
import { Home, ListMusic, Search, Settings } from "lucide-react";

export default function Header() {

    const location = useLocation();

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
        <>
            {/* Top Navigation - All Screens */}
            <header
                className="
                    sticky
                    top-0
                    z-50
                    border-b
                    border-gray-200
                    bg-white/90
                    px-3
                    py-2
                    backdrop-blur
                "
            >

                <nav
                    className="
                        flex
                        justify-between
                        bg-gray-100
                        rounded-lg
                        p-1
                    "
                >

                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`
                                    flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors
                                    ${isActive
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    }
                                `}
                            >
                                <item.icon className="h-4 w-4" />
                                <span className="text-xs">{item.label}</span>
                            </NavLink>
                        );
                    })}

                </nav>

            </header>
        </>
    );
}