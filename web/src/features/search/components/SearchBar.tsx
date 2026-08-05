import { Loader2, Search } from "lucide-react";

interface Props {
    value: string;
    onChange(value: string): void;
    onSearch(): void;
    loading?: boolean;
}

export default function SearchBar({ value, onChange, onSearch, loading = false }: Props) {
    return (
        <form className="relative" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-300" />
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Cari judul lagu atau nama penyanyi..."
                aria-label="Cari lagu karaoke di YouTube"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 pl-12 pr-32 text-white text-sm outline-none placeholder:text-slate-500 focus:border-teal-300/60"
            />
            <button type="submit" disabled={loading || !value.trim()} className={`absolute right-3 top-1/2 flex min-h-12 -translate-y-1/2 items-center justify-center rounded-2xl bg-teal-300 px-5 text-sm font-semibold text-slate-950 transition ${loading || !value.trim() ? "cursor-not-allowed opacity-50" : "hover:bg-teal-200 active:scale-[0.98]"}`}>
                {loading ? <Loader2 size={17} className="animate-spin" /> : "Cari"}
            </button>
        </form>
    );
}
