import Card from "../../../shared/components/Card";

export default function PlaylistEmpty() {

    return (

        <Card>

            <p
                className="
                    text-lg
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

                Empty playlist

            </p>

            <p
                className="
                    mt-1
                    text-sm
                    text-[#b8b8d0]
                "
            >

                Search for videos and add them to the playlist.

            </p>

        </Card>

    );

}