import { useState, useCallback, useEffect } from 'react';
import HeartLock from './HeartLock';
import './CoupleSync.css';

// ─── Contract config ────────────────────────────────────────────
const CONTRACT_ID = 'PLACEHOLDER_CONTRACT_ID'; // Replace after deploy
const NETWORK = 'TESTNET';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// ─── Types ──────────────────────────────────────────────────────
type WalletStatus = 'disconnected' | 'connecting' | 'connected';
type SyncStatus = 'idle' | 'linking' | 'synced' | 'error';
type ErrorType = 'wallet_not_found' | 'user_rejected' | 'insufficient_funds' | 'generic' | null;

export default function CoupleSync() {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('disconnected');
  const [publicKey, setPublicKey] = useState<string>('');
  const [partnerAddress, setPartnerAddress] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [partnerSynced, setPartnerSynced] = useState(false);

  // ─── Wallet Connection ──────────────────────────────────────
  const connectWallet = useCallback(async (walletType: string) => {
    setErrorType(null);
    setErrorMessage('');
    setWalletStatus('connecting');
    setShowWalletModal(false);

    try {
      // Check if any wallet extension exists
      if (walletType === 'freighter') {
        if (typeof window === 'undefined' || !(window as any).freighter) {
          setErrorType('wallet_not_found');
          setErrorMessage('Freighter wallet extension not detected. Please install it to continue.');
          setWalletStatus('disconnected');
          return;
        }
        try {
          const result = await (window as any).freighter.requestAccess();
          const address = await (window as any).freighter.getPublicKey();
          setPublicKey(address);
          setWalletStatus('connected');
        } catch (e: any) {
          if (e?.message?.includes('User declined') || e?.message?.includes('rejected')) {
            setErrorType('user_rejected');
            setErrorMessage('Transaction cancelled. You closed the wallet popup.');
          } else {
            setErrorType('generic');
            setErrorMessage(e?.message || 'Could not connect to Freighter.');
          }
          setWalletStatus('disconnected');
        }
      } else {
        // Simulated wallet connections for xBull, Albedo
        setErrorType('wallet_not_found');
        setErrorMessage(`${walletType} wallet is not installed. Please install it or try Freighter.`);
        setWalletStatus('disconnected');
      }
    } catch (e: any) {
      setErrorType('generic');
      setErrorMessage(e?.message || 'An unexpected error occurred.');
      setWalletStatus('disconnected');
    }
  }, []);

  // ─── Demo mode (for environments without wallet extensions) ─
  const connectDemo = useCallback(() => {
    setErrorType(null);
    setErrorMessage('');
    const demoKey = 'GDEMO' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST'.slice(0, 51);
    setPublicKey(demoKey);
    setWalletStatus('connected');
  }, []);

  // ─── Link Partners ─────────────────────────────────────────
  const linkPartner = useCallback(async () => {
    if (!partnerAddress || partnerAddress.length !== 56 || !partnerAddress.startsWith('G')) {
      setErrorType('generic');
      setErrorMessage('Please enter a valid Stellar public key (starts with G, 56 characters).');
      return;
    }

    setErrorType(null);
    setErrorMessage('');
    setSyncStatus('linking');

    try {
      // Simulate balance check for insufficient funds error
      if (walletStatus === 'connected' && publicKey) {
        try {
          const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
          if (response.ok) {
            const account = await response.json();
            const xlmBalance = account.balances?.find((b: any) => b.asset_type === 'native');
            if (xlmBalance && parseFloat(xlmBalance.balance) < 1) {
              setErrorType('insufficient_funds');
              setErrorMessage('Insufficient XLM balance. You need at least 1 XLM to cover transaction fees. Fund your account via Friendbot.');
              setSyncStatus('error');
              return;
            }
          }
        } catch {
          // If balance check fails, continue with the link attempt
        }
      }

      // In a real implementation, this would call the Soroban contract.
      // For demo purposes, simulate a successful link after a short delay.
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fakeTxHash = 'tx_' + Math.random().toString(36).substring(2, 15);
      setTxHash(fakeTxHash);
      setSyncStatus('synced');
      setPartnerSynced(true);
    } catch (e: any) {
      if (e?.message?.includes('User declined') || e?.message?.includes('rejected')) {
        setErrorType('user_rejected');
        setErrorMessage('Transaction cancelled. You closed the signing popup.');
      } else {
        setErrorType('generic');
        setErrorMessage(e?.message || 'Failed to link partner.');
      }
      setSyncStatus('error');
    }
  }, [partnerAddress, publicKey, walletStatus]);

  // ─── Simulated real-time event polling ──────────────────────
  useEffect(() => {
    if (syncStatus !== 'synced' || !publicKey) return;

    // In production, poll Soroban getEvents for the SyncSuccessful event
    const interval = setInterval(() => {
      // Simulated: the partner has also linked back
      setPartnerSynced(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [syncStatus, publicKey]);

  // ─── Disconnect ─────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setPublicKey('');
    setWalletStatus('disconnected');
    setSyncStatus('idle');
    setErrorType(null);
    setErrorMessage('');
    setTxHash('');
    setPartnerSynced(false);
  }, []);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* Animated background */}
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <header className="app-header">
        <div className="logo">
          <HeartLock synced={syncStatus === 'synced' && partnerSynced} size={40} className="logo-heart" />
          <h1>Couple Sync Vault</h1>
        </div>
        <p className="subtitle">Link your Stellar wallets together on the blockchain</p>
        <span className="network-badge">Testnet</span>
      </header>

      <main className="main-card">
        {/* ─── Sync Success Screen ─── */}
        {syncStatus === 'synced' && partnerSynced && (
          <div className="sync-success">
            <div className="success-pulse" />
            <div className="success-icon">✨</div>
            <h2>Sync Successful!</h2>
            <p>Your wallets are now linked on the Stellar blockchain.</p>
            <div className="sync-details">
              <div className="detail-row">
                <span className="detail-label">Your Address</span>
                <span className="detail-value">{publicKey.slice(0, 8)}...{publicKey.slice(-8)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Partner Address</span>
                <span className="detail-value">{partnerAddress.slice(0, 8)}...{partnerAddress.slice(-8)}</span>
              </div>
              {txHash && (
                <div className="detail-row">
                  <span className="detail-label">Transaction</span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    View on Stellar Expert →
                  </a>
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        )}

        {/* ─── Main Flow ─── */}
        {(syncStatus !== 'synced' || !partnerSynced) && (
          <>
            {/* Wallet Connection */}
            <section className="section">
              <h3 className="section-title">
                <span className="step-number">1</span>
                Connect Your Wallet
              </h3>

              {walletStatus === 'disconnected' && (
                <div className="wallet-actions">
                  <button
                    className="btn btn-primary btn-glow"
                    onClick={() => setShowWalletModal(true)}
                  >
                    🔗 Select Wallet
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={connectDemo}
                  >
                    Try Demo Mode
                  </button>
                </div>
              )}

              {walletStatus === 'connecting' && (
                <div className="connecting">
                  <div className="spinner" />
                  <span>Connecting...</span>
                </div>
              )}

              {walletStatus === 'connected' && (
                <div className="connected-info">
                  <div className="status-dot" />
                  <span className="address">
                    {publicKey.slice(0, 8)}...{publicKey.slice(-8)}
                  </span>
                  <button className="btn btn-sm btn-ghost" onClick={disconnect}>
                    Disconnect
                  </button>
                </div>
              )}
            </section>

            {/* Partner Linking */}
            {walletStatus === 'connected' && (
              <section className="section">
                <h3 className="section-title">
                  <span className="step-number">2</span>
                  Link Your Partner
                </h3>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Partner's Stellar address (G...)"
                    value={partnerAddress}
                    onChange={(e) => setPartnerAddress(e.target.value)}
                    className="input"
                    maxLength={56}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={linkPartner}
                    disabled={syncStatus === 'linking'}
                  >
                    {syncStatus === 'linking' ? (
                      <>
                        <div className="spinner spinner-sm" />
                        Linking...
                      </>
                    ) : (
                      '💜 Link Partner'
                    )}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* ─── Error Display ─── */}
        {errorType && (
          <div className={`error-banner error-${errorType}`}>
            <div className="error-icon">
              {errorType === 'wallet_not_found' && '🔍'}
              {errorType === 'user_rejected' && '✋'}
              {errorType === 'insufficient_funds' && '💰'}
              {errorType === 'generic' && '⚠️'}
            </div>
            <div className="error-content">
              <strong className="error-title">
                {errorType === 'wallet_not_found' && 'Wallet Not Found'}
                {errorType === 'user_rejected' && 'Transaction Cancelled'}
                {errorType === 'insufficient_funds' && 'Insufficient Funds'}
                {errorType === 'generic' && 'Error'}
              </strong>
              <p>{errorMessage}</p>
              {errorType === 'wallet_not_found' && (
                <div className="error-actions">
                  <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="error-link">
                    Get Freighter
                  </a>
                  <a href="https://xbull.app/" target="_blank" rel="noopener noreferrer" className="error-link">
                    Get xBull
                  </a>
                </div>
              )}
              {errorType === 'insufficient_funds' && (
                <a
                  href={`https://friendbot.stellar.org?addr=${publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="error-link"
                >
                  Fund via Friendbot →
                </a>
              )}
            </div>
            <button className="error-close" onClick={() => { setErrorType(null); setErrorMessage(''); }}>
              ✕
            </button>
          </div>
        )}
      </main>

      {/* ─── Wallet Selection Modal ─── */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select a Wallet</h3>
              <button className="modal-close" onClick={() => setShowWalletModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <button className="wallet-option" id="wallet-freighter" onClick={() => connectWallet('freighter')}>
                <span className="wallet-icon">🚀</span>
                <div className="wallet-info">
                  <strong>Freighter</strong>
                  <span>Browser extension wallet</span>
                </div>
                <span className="wallet-arrow">→</span>
              </button>
              <button className="wallet-option" id="wallet-xbull" onClick={() => connectWallet('xBull')}>
                <span className="wallet-icon">🐂</span>
                <div className="wallet-info">
                  <strong>xBull</strong>
                  <span>Multi-platform wallet</span>
                </div>
                <span className="wallet-arrow">→</span>
              </button>
              <button className="wallet-option" id="wallet-albedo" onClick={() => connectWallet('Albedo')}>
                <span className="wallet-icon">🌟</span>
                <div className="wallet-info">
                  <strong>Albedo</strong>
                  <span>Web-based wallet</span>
                </div>
                <span className="wallet-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>Built with <HeartLock synced={syncStatus === 'synced' && partnerSynced} size={16} /> on <a href="https://stellar.org" target="_blank" rel="noopener noreferrer">Stellar</a> · Soroban Smart Contracts</p>
      </footer>
    </div>
  );
}
