import React from 'react';
import HeartLock from './HeartLock';

interface WelcomeCardProps {
    onStart: () => void;
}

export default function WelcomeCard({ onStart }: WelcomeCardProps) {
    return (
        <div className="welcome-screen">
            {/* ── Hero ── */}
            <div className="welcome-hero">
                <span className="welcome-badge">✨ Stellar Blockchain · Testnet</span>
                <div className="welcome-logo-wrap">
                    <HeartLock synced={false} size={80} />
                </div>
                <h1 className="welcome-title">Couple Sync Vault</h1>
                <p className="welcome-tagline">
                    The romantic way to unite your Stellar wallets —<br />
                    one transaction, linked <em>forever</em> on the blockchain.
                </p>
                <button className="btn btn-primary btn-glow welcome-cta" onClick={onStart}>
                    🔗 Get Started — It's Free
                </button>
                <p className="welcome-hint">No sign-up · No email · Takes ~30 seconds</p>
            </div>

            {/* ── Features ── */}
            <div className="welcome-features">
                <div className="feature-card">
                    <div className="feature-icon">🔐</div>
                    <strong>On-Chain Bond</strong>
                    <span>Your link is recorded permanently on the Stellar blockchain — immutable and verifiable by anyone.</span>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">⚡</div>
                    <strong>Real-Time Sync</strong>
                    <span>Both partners see the same synced status the moment the transaction confirms on-chain.</span>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">💜</div>
                    <strong>Self-Custody</strong>
                    <span>You keep your keys. No email, no password — just your Stellar wallet and your partner's.</span>
                </div>
            </div>

            {/* ── How it works ── */}
            <div className="welcome-how">
                <p className="welcome-how-title">How it works</p>
                <div className="welcome-steps-row">
                    <div className="welcome-step">
                        <span className="welcome-step-num">1</span>
                        <strong>Connect</strong>
                        <span>Your Stellar wallet</span>
                    </div>
                    <div className="welcome-step-arrow">→</div>
                    <div className="welcome-step">
                        <span className="welcome-step-num">2</span>
                        <strong>Enter</strong>
                        <span>Partner's address</span>
                    </div>
                    <div className="welcome-step-arrow">→</div>
                    <div className="welcome-step">
                        <span className="welcome-step-num">3</span>
                        <strong>Confirm</strong>
                        <span>On the blockchain</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
