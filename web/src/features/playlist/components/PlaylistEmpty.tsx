import { useNavigate } from "react-router-dom";
import Card from "../../../shared/components/Card";

export default function PlaylistEmpty() {

    const navigate = useNavigate();

    return (

        <Card
            className="border-dashed text-center cursor-pointer transition-all duration-200 hover:border-violet-500/60 hover:bg-white/[0.06] active:scale-[0.98]"
            onClick={() => navigate("/search")}
            role="button"
            aria-label="Cari lagu karaoke"
        >

            <p
                className="
                    text-3xl
                "
            >

                🎤

            </p>

            <p
                className="
                    mt-2
                    font-medium
                    text-white
                "
            >

                Antrean masih kosong

            </p>

            <p
                className="
                    mt-1
                    text-sm
                    text-slate-400
                "
            >

                Cari lagu karaoke lalu tambahkan ke antrean.

            </p>

            <p
                className="
                    mt-3
                    text-xs
                    font-medium
                    text-violet-400
                    flex
                    items-center
                    justify-center
                    gap-1
                "
            >
                <span>Tap untuk mulai mencari</span>
                <span>→</span>
            </p>

        </Card>

    );

}
