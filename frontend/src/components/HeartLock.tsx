import type { CSSProperties } from 'react';

interface HeartLockProps {
    synced: boolean;
    size?: number;
    className?: string;
}

export default function HeartLock({ synced, size = 40, className = '' }: HeartLockProps) {
    const style: CSSProperties = {
        transition: 'filter 0.3s ease, transform 0.3s ease',
        filter: synced
            ? 'drop-shadow(0 0 12px rgba(236, 72, 153, 0.7))'
            : 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.4))',
    };

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width={size}
            height={size}
            className={`heart-lock ${synced ? 'heart-lock--synced' : ''} ${className}`}
            style={style}
            aria-label="Couple Sync Vault logo"
        >
            {/* Heart shape */}
            <path
                d="M32 56 C32 56 6 40 6 22 C6 13 13 6 22 6 C27 6 31 9 32 12 C33 9 37 6 42 6 C51 6 58 13 58 22 C58 40 32 56 32 56Z"
                fill={synced ? '#ec4899' : '#7c3aed'}
                stroke={synced ? '#f472b6' : '#a78bfa'}
                strokeWidth="1.5"
                style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}
            />

            {/* Lock body */}
            <rect
                x="23"
                y="28"
                width="18"
                height="14"
                rx="3"
                fill={synced ? '#fdf2f8' : '#ede9fe'}
                stroke={synced ? '#ec4899' : '#7c3aed'}
                strokeWidth="1.5"
                style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}
            />

            {/* Lock shackle */}
            <path
                d={synced
                    ? 'M27 28 V24 C27 20 31 17 35 17 C39 17 37 20 37 24 V28'  /* open shackle */
                    : 'M27 28 V24 C27 19 31 17 32 17 C33 17 37 19 37 24 V28'  /* closed shackle */
                }
                fill="none"
                stroke={synced ? '#ec4899' : '#7c3aed'}
                strokeWidth="2"
                strokeLinecap="round"
                style={{ transition: 'd 0.3s ease, stroke 0.3s ease' }}
            />

            {/* Keyhole */}
            <circle
                cx="32"
                cy="33"
                r="2"
                fill={synced ? '#ec4899' : '#7c3aed'}
                style={{ transition: 'fill 0.3s ease' }}
            />
            <rect
                x="31"
                y="34"
                width="2"
                height="4"
                rx="1"
                fill={synced ? '#ec4899' : '#7c3aed'}
                style={{ transition: 'fill 0.3s ease' }}
            />
        </svg>
    );
}
