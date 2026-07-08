import {

    Outlet

} from "react-router-dom";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function MainLayout() {

    return (

        <div
            className="
                min-h-screen
                bg-gray-100
            "
        >

            <div
                className="
                    mx-auto
                    flex
                    min-h-screen
                    max-w-md
                    flex-col
                    bg-white
                    shadow-xl
                "
            >

                <Header />

                <main
                    className="
                        flex-1
                    "
                >

                    <Outlet />

                </main>

                <Footer />

            </div>

        </div>

    );

}