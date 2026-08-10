import { useLocation } from "react-router-dom";
import { Home, ListMusic, Search, Settings } from "lucide-react";

import MenuLink from "../shared/components/MenuLink";

export default function Footer() {

    const location = useLocation();

    const navItems = [
        {
            path: "/",
            label: "Home",
            icon: Home
        },
        {
            path: "/playlist",
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

        <footer
            className="
                fixed
                bottom-0
                left-0
                right-0
                z-50
                border-t
                border-[#2a2a4a]
                bg-[#0a0a14]
                px-3
                py-2
                pb-[env(safe-area-inset-bottom)]
                landscape:py-1
                landscape:pb-1
            "
        >
            <nav
                className="
                    flex
                    justify-between
                    bg-[#12121f]
                    rounded-lg
                    p-1
                    landscape:max-w-md
                    landscape:mx-auto
                "
            >
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <MenuLink
                            key={item.path}
                            to={item.path}
                            className={`
                                flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all
                                ${isActive
                                    ? "bg-[#ff2d95] text-white shadow-[0_0_10px_rgba(255,45,149,0.5)]"
                                    : "text-[#b8b8d0] hover:text-[#00f0ff] hover:bg-[#1a1a2e]"
                                }
                            `}
                        >
                            <item.icon className="h-4 w-4" />
                            <span className="text-xs">{item.label}</span>
                        </MenuLink>
                    );
                })}
            </nav>
        </footer>

    );

}