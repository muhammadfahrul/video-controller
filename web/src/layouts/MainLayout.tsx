import { Outlet } from "react-router-dom";

import Footer from "./Footer";

export default function MainLayout() {

    return (

        <div
            className="
                min-h-screen
                bg-gray-100
                md:bg-gray-200
            "
        >

            {/* Mobile: Full width | Tablet/Desktop: Centered container */}
            <div
                className="
                    mx-auto
                    flex
                    min-h-screen
                    flex-col
                    bg-gray-50
                    md:max-w-2xl
                    md:shadow-xl
                    md:my-4
                    md:rounded-xl
                    md:min-h-[calc(100vh-32px)]
                "
            >

                <main
                    className="
                        flex-1
                        overflow-y-auto
                        p-4
                        pb-20
                    "
                >

                    <Outlet />

                </main>

                <Footer />
            </div>

        </div>

    );

}