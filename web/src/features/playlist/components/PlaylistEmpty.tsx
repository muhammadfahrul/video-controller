import Card from "../../../shared/components/Card";

export default function PlaylistEmpty() {

    return (

        <Card>

            <p
                className="
                    text-lg
                "
            >

                📭

            </p>

            <p
                className="
                    mt-2
                    font-medium
                "
            >

                Playlist kosong

            </p>

            <p
                className="
                    mt-1
                    text-sm
                    text-gray-500
                "
            >

                Cari video lalu tambahkan ke playlist.

            </p>

        </Card>

    );

}