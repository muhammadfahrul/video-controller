import { useEffect, useState } from "react";

export interface EmojiParticle {
    id: string;
    emoji: string;
    left: number; // percentage 5% - 95%
    size: number; // font size in px
    duration: number; // seconds
}

interface Props {
    triggerCount: number;
}

const ATMOSPHERE_EMOJIS = ["👏", "👏", "🥳", "🎉", "🔥", "👏", "🙌", "❤️", "⭐"];

export default function AtmosphereEffect({ triggerCount }: Props) {
    const [particles, setParticles] = useState<EmojiParticle[]>([]);

    useEffect(() => {
        if (triggerCount <= 0) return;

        // Generate 8 floating particles per trigger
        const particleCount = 8;
        const newParticles: EmojiParticle[] = Array.from({ length: particleCount }).map(() => {
            const randomEmoji = ATMOSPHERE_EMOJIS[Math.floor(Math.random() * ATMOSPHERE_EMOJIS.length)];
            return {
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                emoji: randomEmoji,
                left: Math.floor(Math.random() * 85) + 5, // 5% to 90%
                size: Math.floor(Math.random() * 16) + 24, // 24px - 40px
                duration: Math.random() * 0.8 + 1.2, // 1.2s - 2.0s
            };
        });

        setParticles((prev) => [...prev, ...newParticles]);

        const timer = setTimeout(() => {
            setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
        }, 2200);

        return () => clearTimeout(timer);
    }, [triggerCount]);

    if (particles.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute bottom-10 animate-float-up select-none filter drop-shadow-md"
                    style={{
                        left: `${p.left}%`,
                        fontSize: `${p.size}px`,
                        animationDuration: `${p.duration}s`,
                    }}
                >
                    {p.emoji}
                </div>
            ))}
        </div>
    );
}
