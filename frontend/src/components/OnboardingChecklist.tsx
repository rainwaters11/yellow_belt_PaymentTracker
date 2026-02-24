import React, { useState } from 'react';

interface OnboardingChecklistProps {
    walletConnected: boolean;
    hasFunds: boolean;
    partnerLinked: boolean;
}

export default function OnboardingChecklist({
    walletConnected,
    hasFunds,
    partnerLinked,
}: OnboardingChecklistProps) {
    const [isDismissed, setIsDismissed] = useState(false);

    if (isDismissed || (walletConnected && hasFunds && partnerLinked)) {
        return null;
    }

    return (
        <div className="onboarding-checklist">
            <div className="checklist-header">
                <h4>Getting Started</h4>
                <button
                    className="checklist-close"
                    onClick={() => setIsDismissed(true)}
                    aria-label="Dismiss checklist"
                >
                    ✕
                </button>
            </div>
            <ul className="checklist-items">
                <li className={`checklist-item ${walletConnected ? 'completed' : ''}`}>
                    <span className="checkbox">{walletConnected ? '✅' : '⏳'}</span>
                    <span>Connect Wallet</span>
                </li>
                <li className={`checklist-item ${hasFunds ? 'completed' : ''}`}>
                    <span className="checkbox">{hasFunds ? '✅' : '⏳'}</span>
                    <span>Fund Account</span>
                </li>
                <li className={`checklist-item ${partnerLinked ? 'completed' : ''}`}>
                    <span className="checkbox">{partnerLinked ? '✅' : '⏳'}</span>
                    <span>Link Partner</span>
                </li>
            </ul>
        </div>
    );
}
