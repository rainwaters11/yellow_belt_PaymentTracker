import type { CSSProperties } from 'react';

interface HeartLockProps {
    synced: boolean;
    isAnimating?: boolean;
    size?: number;
    className?: string;
}

export default function HeartLock({ synced, isAnimating = false, size = 40, className = '' }: HeartLockProps) {
    const style: CSSProperties = {
        transition: 'filter 0.3s ease, transform 0.3s ease',
        filter: synced
            ? 'drop-shadow(0 0 12px rgba(236, 72, 153, 0.7))'
            : 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.4))',
        animation: isAnimating ? 'pulse 1.5s infinite ease-in-out' : 'none'
    };

    const heartFill = synced ? '#ec4899' : '#7c3aed';
    const heartStroke = synced ? '#f472b6' : '#a78bfa';
    const lockFill = synced ? '#fce7f3' : '#ede9fe';
    const lockStroke = synced ? '#be185d' : '#5b21b6';

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className={`heart-lock ${synced ? 'heart-lock--synced' : ''} ${className}`}
            style={style}
            aria-label="Couple Sync Vault logo"
        >
            {/* Heart shape */}
            <path
                d="M50 88 C50 88 8 62 8 32 C8 18 19 8 33 8 C41 8 48 13 50 18 C52 13 59 8 67 8 C81 8 92 18 92 32 C92 62 50 88 50 88Z"
                fill={heartFill}
                stroke={heartStroke}
                strokeWidth="2"
                style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}
            />

            {/* Lock shackle (the U-shaped top part) */}
            <path
                d={synced
                    ? 'M38 44 L38 34 C38 25 43 20 50 20 C54 20 56 22 57 26 L57 30 L57 28'
                    : 'M38 44 L38 34 C38 25 43 20 50 20 C57 20 62 25 62 34 L62 44'
                }
                fill="none"
                stroke={lockStroke}
                strokeWidth="4.5"
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s ease' }}
            />

            {/* Lock body (rounded rectangle) */}
            <rect
                x="33"
                y="44"
                width="34"
                height="26"
                rx="5"
                ry="5"
                fill={lockFill}
                stroke={lockStroke}
                strokeWidth="3"
                style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}
            />

            {/* Keyhole - circle */}
            <circle
                cx="50"
                cy="54"
                r="4"
                fill={lockStroke}
                style={{ transition: 'fill 0.3s ease' }}
            />

            {/* Keyhole - bottom notch */}
            <path
                d="M48 56 L50 65 L52 56"
                fill={lockStroke}
                style={{ transition: 'fill 0.3s ease' }}
            />
        </svg>
    );
}
