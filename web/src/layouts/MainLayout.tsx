import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import AppHeader from "./AppHeader";

import FullPageLoading from "../shared/components/FullPageLoading";

import { useAppStore } from "../store/appStore";
import { useAgent } from "../hooks/useAgent";

export default function MainLayout() {

    useAgent();

    const globalLoading = useAppStore((state)=>state.globalLoading);
    const initialLoading = useAppStore((state)=>state.initialLoading);

    return (

        <div className="min-h-dvh">

            {(globalLoading || initialLoading) && <FullPageLoading />}

            <div className="glass-shell mx-auto flex min-h-dvh max-w-5xl flex-col sm:min-h-[calc(100dvh-32px)] sm:my-4 sm:rounded-3xl sm:border sm:border-white/8">

                <AppHeader />

                <main className="flex-1 px-4 py-5 pb-28 sm:px-6 sm:py-6 sm:pb-28 lg:px-8">

                    <Outlet />

                </main>

                <Footer />
            </div>

        </div>

    );

}
