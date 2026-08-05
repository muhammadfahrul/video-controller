import PlaylistPanel from "../features/playlist/components/PlaylistPanel";

export default function PlaylistPage() {

    return (

        <div className="space-y-4 tablet-landscape-text">

            <p className="text-sm text-slate-400 tablet-landscape-text">Atur urutan lagu untuk sesi karaoke berikutnya.</p>

            <PlaylistPanel />

        </div>

    );

}
