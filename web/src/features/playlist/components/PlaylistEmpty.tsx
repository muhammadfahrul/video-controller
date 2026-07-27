import Card from "../../../shared/components/Card";

export default function PlaylistEmpty() {

    return (

        <Card className="border-dashed text-center">

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

        </Card>

    );

}
