import { Loader2 } from "lucide-react";

export default function FullPageLoading() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090b12]/75 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#151a28] p-7 shadow-2xl">
                <Loader2 className="h-12 w-12 animate-spin text-teal-300" />
                <p className="text-lg font-medium text-white">Processing...</p>
            </div>
        </div>
    );
}
