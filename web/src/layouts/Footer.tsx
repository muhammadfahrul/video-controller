import { useLocation } from "react-router-dom";
import { Home, ListMusic, Search, Settings } from "lucide-react";

import MenuLink from "../shared/components/MenuLink";

export default function Footer() {

    const location = useLocation();

    const navItems = [
        {
            path: "/",
            label: "UTAMA",
            icon: Home
        },
        {
            path: "/playlist",
            label: "PLAYLIST",
            icon: ListMusic
        },
        {
            path: "/search",
            label: "SEARCH",
            icon: Search
        },
        {
            path: "/settings",
            label: "SETTINGS",
            icon: Settings
        }
    ];

    return (

        <footer className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:bottom-4 sm:pb-0">
            <nav className="mx-auto flex max-w-xl items-center justify-between rounded-2xl border border-white/15 bg-gradient-to-r from-[#2b1439]/90 via-[#281532]/90 to-[#21132f]/90 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <MenuLink
                            key={item.path}
                            to={item.path}
                            className={`
                                flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-all duration-200 sm:flex-row sm:gap-1.5
                                ${isActive
                                    ? "bg-gradient-to-r from-pink-400 to-fuchsia-400 text-white shadow-lg shadow-pink-500/30"
                                    : "text-fuchsia-100/65 hover:bg-white/10 hover:text-white"
                                }
                            `}
                        >
                            <item.icon className="size-[18px]" />
                            <span>{item.label}</span>
                        </MenuLink>
                    );
                })}
            </nav>
        </footer>

    );

}
