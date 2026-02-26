import { useState, useCallback, useEffect, useRef } from 'react';
import HeartLock from './HeartLock';
import WelcomeCard from './WelcomeCard';
import OnboardingChecklist from './OnboardingChecklist';
import './CoupleSync.css';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
// @ts-ignore — resolved via Vite aliases in astro.config.mjs
import { FreighterModule } from 'swk/freighter';
// @ts-ignore
import { xBullModule } from 'swk/xbull';
// @ts-ignore
import { AlbedoModule } from 'swk/albedo';

// Import freighter-api as default (CJS module — named ESM imports break in Vite)
// @ts-ignore
import freighterApi from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';

// ─── Contract config ────────────────────────────────────────────
const CONTRACT_ID = import.meta.env.PUBLIC_CONTRACT_ID || 'CBTWI3DMBN4P3XVEUPKSVOSRYH6NFKYZ3RFKWA54YGBTEOA4YSO7VLOW';
const NETWORK = import.meta.env.PUBLIC_NETWORK || 'TESTNET';
const HORIZON_URL = import.meta.env.PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const SOROBAN_URL = import.meta.env.PUBLIC_SOROBAN_URL || 'https://soroban-testnet.stellar.org';

// Supported Stellar network passphrases
const NETWORKS: Record<string, string> = {
  TESTNET: 'Test SDF Network ; September 2015',
  FUTURENET: 'Test SDF Future Network ; October 2022',
  PUBLIC: 'Public Global Stellar Network ; September 2015',
};
const NETWORK_PASSPHRASE = NETWORKS[NETWORK] || NETWORKS.TESTNET;

// ─── Types ──────────────────────────────────────────────────────
type WalletStatus = 'disconnected' | 'connecting' | 'connected';
type SyncStatus = 'idle' | 'linking' | 'synced' | 'error';
type ErrorType = 'wallet_not_found' | 'user_rejected' | 'insufficient_funds' | 'generic' | null;

export default function CoupleSync() {
  if (typeof window !== 'undefined') {
    console.log("Local Storage Check (on render):", localStorage.getItem("partnerAddress"));
  }

  const [walletStatus, setWalletStatus] = useState<WalletStatus>('disconnected');
  const [publicKey, setPublicKey] = useState<string>('');
  const [partnerAddress, setPartnerAddress] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [partnerSynced, setPartnerSynced] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasFunds, setHasFunds] = useState(false);
  const kitReady = useRef(false);

  // ─── Initialize StellarWalletsKit ──────────────────────────
  useEffect(() => {
    if (!kitReady.current) {
      StellarWalletsKit.init({
        modules: [
          new FreighterModule(),
          new xBullModule(),
          new AlbedoModule(),
        ],
        network: NETWORK_PASSPHRASE as any,
      });
      kitReady.current = true;

      // ── Diagnostic: check freighter-api availability ──
      (async () => {
        try {
          const connCheck = await freighterApi.isConnected();
          console.log('[CoupleSync] freighter-api isConnected:', connCheck);
        } catch (err) {
          console.log('[CoupleSync] freighter-api check failed:', err);
        }
      })();
    }
  }, []);

  // ─── Background Balance Watcher ──────────────────────────────
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkBalance = async () => {
      // Only check if connected, not demo, and hasn't yet been marked as funded
      if (walletStatus !== 'connected' || publicKey.startsWith('GDEMO') || hasFunds) {
        return;
      }

      try {
        const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
        if (response.ok) {
          const data = await response.json();
          const nativeBalance = data.balances.find((b: any) => b.asset_type === 'native');

          if (nativeBalance && parseFloat(nativeBalance.balance) > 0) {
            setHasFunds(true);
          }
        }
      } catch (err) {
        // Ignore errors, could be 404 if account doesn't exist yet on network
      }
    };

    // Initial check
    checkBalance();

    // Poll every 5 seconds while waiting for funds
    if (walletStatus === 'connected' && !publicKey.startsWith('GDEMO') && !hasFunds) {
      intervalId = setInterval(checkBalance, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [walletStatus, publicKey, hasFunds]);

  // ─── Local Storage Initialization & Sync ────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('partnerAddress');
      if (saved) {
        setPartnerAddress(saved);
        console.log('Loaded from storage on mount:', saved);
      }
    }
  }, []); // Run once on mount to populate

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPartnerAddress(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('partnerAddress', val);
      console.log('Saved to storage (onChange):', val);
    }
  };

  useEffect(() => {
    // Whenever a partner is successfully synced, ensure we record it
    if (syncStatus === 'synced' && partnerSynced && partnerAddress) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('partnerAddress', partnerAddress);
        console.log('Saved to storage (on sync):', partnerAddress);
      }
    }
  }, [syncStatus, partnerSynced, partnerAddress]);

  // ─── Wallet Connection via StellarWalletsKit + freighter-api ──
  const connectWallet = useCallback(async (walletId: string) => {
    setErrorType(null);
    setErrorMessage('');
    setWalletStatus('connecting');
    setShowWalletModal(false);

    console.log(`[CoupleSync] Connecting wallet: ${walletId}`);

    // ── Freighter: use freighter-api directly (CJS fix) ──
    if (walletId === 'freighter') {
      try {
        // Step 1: Check if Freighter extension is installed
        const connResult = await freighterApi.isConnected();
        console.log('[CoupleSync] isConnected result:', connResult);

        if (connResult?.error || !connResult?.isConnected) {
          setErrorType('wallet_not_found');
          setErrorMessage('No wallet detected. Please install Freighter to continue.');
          setWalletStatus('disconnected');
          return;
        }

        // Step 2: Request access (triggers the Freighter popup)
        const accessResult = await freighterApi.requestAccess();
        console.log('[CoupleSync] requestAccess result:', accessResult);

        if (accessResult?.error) {
          const errMsg = String(accessResult.error);
          if (errMsg.includes('denied') || errMsg.includes('reject') || errMsg.includes('cancel')) {
            setErrorType('user_rejected');
            setErrorMessage('Transaction cancelled. You closed the wallet popup.');
          } else {
            setErrorType('generic');
            setErrorMessage(errMsg);
          }
          setWalletStatus('disconnected');
          return;
        }

        // Step 3: Get the public address
        const addrResult = await freighterApi.getAddress();
        console.log('[CoupleSync] getAddress result:', addrResult);

        if (addrResult?.error || !addrResult?.address) {
          setErrorType('generic');
          setErrorMessage('Could not retrieve your address from Freighter.');
          setWalletStatus('disconnected');
          return;
        }

        // Also tell StellarWalletsKit which wallet is active
        try { StellarWalletsKit.setWallet('freighter'); } catch (_) { }

        setPublicKey(addrResult.address);
        setWalletStatus('connected');
        console.log(`[CoupleSync] Connected: ${addrResult.address}`);
        return;
      } catch (e: any) {
        console.error('[CoupleSync] Freighter error:', e);
        const msg = (e?.message || '').toLowerCase();
        if (msg.includes('declined') || msg.includes('rejected') || msg.includes('cancel') || msg.includes('denied')) {
          setErrorType('user_rejected');
          setErrorMessage('Transaction cancelled. You closed the wallet popup.');
        } else {
          setErrorType('wallet_not_found');
          setErrorMessage('Could not connect to Freighter. Make sure the extension is installed and unlocked.');
        }
        setWalletStatus('disconnected');
        return;
      }
    }

    // ── xBull / Albedo: use StellarWalletsKit ──
    try {
      StellarWalletsKit.setWallet(walletId);
      const { address } = await StellarWalletsKit.getAddress();
      setPublicKey(address);
      setWalletStatus('connected');
    } catch (e: any) {
      const msg = (e?.message || e?.toString() || '').toLowerCase();
      if (msg.includes('not connected') || msg.includes('not installed') || msg.includes('not available')) {
        setErrorType('wallet_not_found');
        setErrorMessage(`${walletId} wallet extension not detected. Please install it to continue.`);
      } else if (msg.includes('declined') || msg.includes('rejected') || msg.includes('cancel') || msg.includes('denied')) {
        setErrorType('user_rejected');
        setErrorMessage('Transaction cancelled. You closed the wallet popup.');
      } else {
        setErrorType('wallet_not_found');
        setErrorMessage(`Could not connect to ${walletId}. Make sure the extension is installed and unlocked.`);
      }
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('partnerAddress', partnerAddress);
      console.log('Saved to storage (Link Partner):', partnerAddress);
    }

    if (!partnerAddress || partnerAddress.length !== 56 || !partnerAddress.startsWith('G')) {
      setErrorType('generic');
      setErrorMessage('Please enter a valid Stellar public key (starts with G, 56 characters).');
      return;
    }

    setErrorType(null);
    setErrorMessage('');
    setSyncStatus('linking');
    setSyncMessage('Checking account balance...');

    try {
      // 1. Simulate balance check for insufficient funds error
      if (walletStatus === 'connected' && publicKey && !publicKey.startsWith('GDEMO')) {
        try {
          const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
          if (!response.ok) {
            if (response.status === 404) {
              setErrorType('insufficient_funds');
              setErrorMessage('Account not found. You need XLM for transaction fees. Fund your account via Friendbot.');
              setSyncStatus('error');
              return;
            }
            throw new Error('Failed to fetch account balance.');
          }
          const account = await response.json();
          const xlmBalance = account.balances?.find((b: any) => b.asset_type === 'native');
          if (!xlmBalance || parseFloat(xlmBalance.balance) < 2) {
            setErrorType('insufficient_funds');
            setErrorMessage('Insufficient balance for transaction fees. You need at least 2 XLM to cover fees and storage rent.');
            setSyncStatus('error');
            return;
          }
        } catch (e: any) {
          console.warn('[CoupleSync] Balance check error:', e);
          // If network fails, we just continue and let the transaction fail
        }
      }

      let txHash = 'tx_' + Math.random().toString(36).substring(2, 15);

      if (walletStatus === 'connected' && publicKey && !publicKey.startsWith('GDEMO')) {
        // 2. Build Transaction
        setSyncMessage('Building transaction...');
        console.log('[CoupleSync] Building transaction...');
        const server = new StellarSdk.rpc.Server(SOROBAN_URL);
        const sourceAccount = await server.getAccount(publicKey);
        const contract = new StellarSdk.Contract(CONTRACT_ID);

        const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: '10000',
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(contract.call('link_partners',
            new StellarSdk.Address(publicKey).toScVal(),
            new StellarSdk.Address(partnerAddress).toScVal()
          ))
          .setTimeout(30)
          .build();

        // 3. Simulate Transaction
        console.log('[CoupleSync] Simulating transaction...');
        const simTx = await server.simulateTransaction(tx);
        if (StellarSdk.rpc.Api.isSimulationError(simTx)) {
          throw new Error('Transaction simulation failed: ' + simTx.error);
        }

        // Assemble the transaction with the footprint from the simulation
        const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simTx as any);
        const assembledTxXdr = assembledTx.build().toXDR();

        // 4. Sign Transaction (Triggers Freighter/xBull popup)
        setSyncMessage('Awaiting wallet signature...');
        console.log('[CoupleSync] Requesting signature...');
        let signedXdr: string;
        try {
          console.log('[CoupleSync] Asking for signature...');

          // Try freighterApi directly first since we know it works
          const directSign = await freighterApi.signTransaction(assembledTxXdr, { networkPassphrase: NETWORK_PASSPHRASE });
          if ((directSign as any).error) {
            throw new Error((directSign as any).error);
          }
          signedXdr = (directSign as any).signedTxXdr || (directSign as any).signedXDR;
        } catch (err: any) {
          console.warn('[CoupleSync] Direct sign failed, falling back to Kit:', err?.message || err);
          // Fall back to StellarWalletsKit
          const signResult = await StellarWalletsKit.signTransaction({
            xdr: assembledTxXdr,
            publicKeys: [publicKey],
            network: NETWORK_PASSPHRASE as any
          } as any);
          signedXdr = (signResult as any).signedXDR || (signResult as any).signedTxXdr;
        }

        // 5. Submit Transaction
        setSyncMessage('Broadcasting to Stellar...');
        console.log('[CoupleSync] Submitting transaction...');
        const submitResponse = await server.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE) as any);
        if (submitResponse.status === 'ERROR' || (submitResponse as any).errorResult) {
          throw new Error('Transaction submission failed on network.');
        }

        console.log('[CoupleSync] Transaction submitted!', submitResponse);
        txHash = submitResponse.hash;
      } else {
        // Demo mode fallback
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setTxHash(txHash);
      setSyncStatus('synced');
      setPartnerSynced(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('partnerAddress', partnerAddress);
      }
    } catch (e: any) {
      console.error('[CoupleSync] Transaction error:', e);
      const msg = (e?.message || e?.toString() || '').toLowerCase();

      // User Rejected handling
      if (msg.includes('user declined') || msg.includes('rejected') || msg.includes('cancel') || msg.includes('denied')) {
        setErrorType('user_rejected');
        setErrorMessage('Transaction Cancelled by User');
      }
      // Other errors
      else {
        setErrorType('generic');
        setErrorMessage(msg || 'Failed to link partner.');
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

      {!hasStarted ? (
        <WelcomeCard onStart={() => setHasStarted(true)} />
      ) : (
        <>
          <OnboardingChecklist
            walletConnected={walletStatus === 'connected'}
            hasFunds={hasFunds || publicKey.startsWith('GDEMO')}
            partnerLinked={syncStatus === 'synced' && partnerSynced}
          />

          <header className="app-header">
            <div className="logo">
              <HeartLock
                synced={syncStatus === 'synced' && partnerSynced}
                isAnimating={syncStatus === 'linking'}
                size={40}
                className="logo-heart"
              />
              <h1>Couple Sync Vault</h1>
            </div>
            <p className="subtitle">Link your Stellar wallets together on the blockchain</p>
            <nav className="header-nav" aria-label="Primary">
              <a href="#sync">Home</a>
              <a href="#goals">Goals</a>
            </nav>
            <span className="network-badge">Testnet</span>
          </header>

          <main className="main-card">
            {/* ─── Sync Success Screen ─── */}
            {syncStatus === 'synced' && partnerSynced && (
              <div className="sync-success">
                <div className="success-pulse" />
                <div className="success-icon">✨</div>
                <h2>Vault Secured: {publicKey.slice(0, 4)} + {partnerAddress.slice(0, 4)}</h2>
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

                <div className="whats-next" style={{ textAlign: 'left', background: 'var(--glass-bg, rgba(255,255,255,0.05))', padding: '1.25rem', borderRadius: '12px', margin: '1.5rem 0' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary, #fff)' }}>What's Next?</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary, rgba(255,255,255,0.7))' }}>
                    <li><strong style={{ color: 'var(--text-primary, #fff)' }}>Verify the Bond:</strong> Click 'View on Stellar Expert' to see your link recorded permanently on the global ledger.</li>
                    <li><strong style={{ color: 'var(--text-primary, #fff)' }}>Test the Shared State:</strong> Have your partner connect their wallet on their device; they will see this same 'Synced' status immediately.</li>
                    <li><strong style={{ color: 'var(--text-primary, #fff)' }}>Digital Time Capsule:</strong> This link is your 'Digital Anniversary'—a verifiable proof of partnership stored on the Stellar Testnet.</li>
                  </ul>
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

                      {/* Friendbot Funding Button */}
                      {!publicKey.startsWith('GDEMO') && !hasFunds && (
                        <button
                          className="btn btn-sm btn-ghost fund-btn"
                          onClick={async (e) => {
                            const btn = e.currentTarget;
                            const originalText = btn.innerText;
                            btn.innerText = 'Funding...';
                            btn.disabled = true;
                            try {
                              const friendbotUrl = NETWORK === 'TESTNET'
                                ? `https://friendbot.stellar.org/?addr=${publicKey}`
                                : `https://friendbot.stellar.org/?addr=${publicKey}`;
                              const response = await fetch(friendbotUrl);
                              if (response.ok) {
                                btn.innerText = 'Funded! ✨';
                                setHasFunds(true);
                                setTimeout(() => {
                                  if (btn) {
                                    btn.innerText = originalText;
                                    btn.disabled = false;
                                  }
                                }, 3000);
                              } else {
                                throw new Error('Friendbot failed');
                              }
                            } catch (err) {
                              btn.innerText = 'Failed ❌';
                              setErrorType('insufficient_funds');
                              setErrorMessage('Internal Friendbot failed. Please open the Freighter extension and click "Get test XLM" at the bottom.');
                              setTimeout(() => {
                                if (btn) {
                                  btn.innerText = originalText;
                                  btn.disabled = false;
                                }
                              }, 3000);
                            }
                          }}
                        >
                          🎁 Fund Me
                        </button>
                      )}

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
                        onChange={handleAddressChange}
                        className="input"
                        maxLength={56}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={linkPartner}
                        disabled={syncStatus === 'linking'}
                        style={{ height: syncStatus === 'linking' ? 'auto' : undefined, padding: syncStatus === 'linking' ? '8px 16px' : undefined }}
                      >
                        {syncStatus === 'linking' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="spinner spinner-sm" />
                              <span>Syncing...</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>{syncMessage}</span>
                          </div>
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
        </>
      )}
    </div>
  );
}
