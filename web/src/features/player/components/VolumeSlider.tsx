import { Minus, Plus, Volume2 } from "lucide-react";
import { useState } from "react";

interface Props {
    value: number;
    disabled?: boolean;
    onChange(value: number): void;
}

export default function VolumeSlider({ value, disabled, onChange }: Props) {
    const [pendingValue, setPendingValue] = useState<number | null>(null);
    const localValue = pendingValue ?? value;

    const updateVolume = (nextValue: number) => {
        const normalizedValue = Math.max(0, Math.min(100, nextValue));
        setPendingValue(normalizedValue);
        onChange(normalizedValue);
    };

    return (
        <section className="h-fit space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-teal-300/10 text-teal-200"><Volume2 size={18} /></div>
                <span className="font-medium text-white">Volume</span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        aria-label="Kurangi volume"
                        disabled={disabled || localValue <= 0}
                        onClick={() => updateVolume(localValue - 5)}
                        className="grid size-10 place-items-center rounded-xl bg-white/[0.07] text-slate-100 transition hover:bg-white/[0.13] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Minus size={18} />
                    </button>
                    <span className="min-w-12 text-center text-sm font-semibold text-teal-200">{localValue}%</span>
                    <button
                        type="button"
                        aria-label="Tambah volume"
                        disabled={disabled || localValue >= 100}
                        onClick={() => updateVolume(localValue + 5)}
                        className="grid size-10 place-items-center rounded-xl bg-teal-300 text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                value={localValue}
                disabled={disabled}
                onChange={(event) => setPendingValue(Number(event.target.value))}
                onMouseUp={() => { if (!disabled) onChange(localValue); }}
                onTouchEnd={() => { if (!disabled) onChange(localValue); }}
                className="w-full"
                aria-label="Volume"
            />
        </section>
    );
}
