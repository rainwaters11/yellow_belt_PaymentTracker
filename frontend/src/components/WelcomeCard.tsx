import React from 'react';

interface WelcomeCardProps {
    onStart: () => void;
}

export default function WelcomeCard({ onStart }: WelcomeCardProps) {
    return (
        <div className="welcome-card">
            <div className="welcome-content">
                <div className="welcome-icon">💜</div>
                <h2>Welcome to Couple Sync Vault</h2>
                <p>
                    Securely link your Stellar wallet with your partner's wallet on the blockchain.
                    Experience real-time synchronization and premium security.
                </p>
                <button className="btn btn-primary btn-glow welcome-btn" onClick={onStart}>
                    Get Started
                </button>
            </div>
        </div>
    );
}
