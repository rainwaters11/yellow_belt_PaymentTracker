import { useState, useCallback, useEffect, useRef } from 'react';
// @ts-ignore
import freighterApi from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';
import './GoalsDashboard.css';

const VAULT_CONTRACT_ID = import.meta.env.PUBLIC_GOALS_VAULT_CONTRACT_ID || '';
const NETWORK = import.meta.env.PUBLIC_NETWORK || 'TESTNET';
const HORIZON_URL = import.meta.env.PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const SOROBAN_URL = import.meta.env.PUBLIC_SOROBAN_URL || 'https://soroban-testnet.stellar.org';
const NETWORKS: Record<string, string> = {
  TESTNET: 'Test SDF Network ; September 2015',
  FUTURENET: 'Test SDF Future Network ; October 2022',
  PUBLIC: 'Public Global Stellar Network ; September 2015',
};
const NETWORK_PASSPHRASE = NETWORKS[NETWORK] || NETWORKS.TESTNET;

// ─── Types ──────────────────────────────────────────────────────
type WalletStatus = 'disconnected' | 'connecting' | 'connected';
type TxStatus = 'idle' | 'pending' | 'success' | 'error';

interface Goal {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  approved: boolean;
  creator: string;
}

export default function GoalsDashboard() {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('disconnected');
  const [publicKey, setPublicKey] = useState<string>('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [goalTitle, setGoalTitle] = useState<string>('');
  const [goalTarget, setGoalTarget] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const configChecked = useRef(false);

  // ─── On Mount: check configuration ──────────────────────────
  useEffect(() => {
    if (!configChecked.current) {
      configChecked.current = true;
      setIsConfigured(!!VAULT_CONTRACT_ID);
    }
  }, []);

  // ─── Connect Wallet ──────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setErrorMessage('');
    setWalletStatus('connecting');

    try {
      const connResult = await freighterApi.isConnected();
      if (connResult?.error || !connResult?.isConnected) {
        setErrorMessage('No wallet detected. Please install Freighter to continue.');
        setWalletStatus('disconnected');
        return;
      }

      const accessResult = await freighterApi.requestAccess();
      if (accessResult?.error) {
        const errMsg = String(accessResult.error);
        if (errMsg.includes('denied') || errMsg.includes('reject') || errMsg.includes('cancel')) {
          setErrorMessage('Transaction cancelled. You closed the wallet popup.');
        } else {
          setErrorMessage(errMsg);
        }
        setWalletStatus('disconnected');
        return;
      }

      const addrResult = await freighterApi.getAddress();
      if (addrResult?.error || !addrResult?.address) {
        setErrorMessage('Could not retrieve your address from Freighter.');
        setWalletStatus('disconnected');
        return;
      }

      setPublicKey(addrResult.address);
      setWalletStatus('connected');
    } catch (e: any) {
      setErrorMessage('Could not connect to Freighter. Make sure the extension is installed and unlocked.');
      setWalletStatus('disconnected');
    }
  }, []);

  // ─── Demo Mode ───────────────────────────────────────────────
  const connectDemo = useCallback(() => {
    setErrorMessage('');
    const demoKey = 'GDEMO' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST'.slice(0, 51);
    setPublicKey(demoKey);
    setWalletStatus('connected');
    setGoals([
      {
        id: 0,
        title: 'Honeymoon Fund',
        targetAmount: 5000,
        currentAmount: 0,
        approved: false,
        creator: demoKey,
      },
    ]);
  }, []);

  // ─── Build + Sign + Submit helper ───────────────────────────
  const buildAndSubmit = useCallback(
    async (operation: StellarSdk.xdr.Operation): Promise<string> => {
      const server = new StellarSdk.rpc.Server(SOROBAN_URL);
      const sourceAccount = await server.getAccount(publicKey);

      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '10000',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simTx = await server.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(simTx)) {
        throw new Error('Transaction simulation failed: ' + simTx.error);
      }

      const assembledTxXdr = StellarSdk.rpc.assembleTransaction(tx, simTx as any).build().toXDR();

      const directSign = await freighterApi.signTransaction(assembledTxXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      if ((directSign as any).error) {
        throw new Error((directSign as any).error);
      }
      const signedXdr: string = (directSign as any).signedTxXdr || (directSign as any).signedXDR;

      const submitResponse = await server.sendTransaction(
        StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as any
      );
      if (submitResponse.status === 'ERROR' || (submitResponse as any).errorResult) {
        throw new Error('Transaction submission failed on network.');
      }

      return submitResponse.hash;
    },
    [publicKey]
  );

  // ─── Create Goal ─────────────────────────────────────────────
  const createGoal = useCallback(async () => {
    if (!goalTitle.trim()) {
      setErrorMessage('Please enter a goal title.');
      return;
    }
    if (!goalTarget || Number(goalTarget) <= 0) {
      setErrorMessage('Please enter a valid target amount.');
      return;
    }

    setErrorMessage('');
    setTxStatus('pending');
    setTxHash('');

    try {
      const contract = new StellarSdk.Contract(VAULT_CONTRACT_ID);
      let hash: string;

      if (publicKey.startsWith('GDEMO')) {
        // Demo mode
        await new Promise((r) => setTimeout(r, 1000));
        hash = 'demo_' + Math.random().toString(36).slice(2, 15);
        setGoals((prev) => [
          ...prev,
          {
            id: prev.length,
            title: goalTitle,
            targetAmount: Number(goalTarget),
            currentAmount: 0,
            approved: false,
            creator: publicKey,
          },
        ]);
      } else {
        const op = contract.call(
          'create_goal',
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.xdr.ScVal.scvString(goalTitle),
          StellarSdk.nativeToScVal(Number(goalTarget), { type: 'i128' })
        );
        hash = await buildAndSubmit(op);
        setGoals((prev) => [
          ...prev,
          {
            id: prev.length,
            title: goalTitle,
            targetAmount: Number(goalTarget),
            currentAmount: 0,
            approved: false,
            creator: publicKey,
          },
        ]);
      }

      setTxHash(hash);
      setTxStatus('success');
      setGoalTitle('');
      setGoalTarget('');
    } catch (e: any) {
      const msg = (e?.message || e?.toString() || '').toLowerCase();
      if (msg.includes('declined') || msg.includes('rejected') || msg.includes('cancel') || msg.includes('denied')) {
        setErrorMessage('Transaction cancelled by user.');
      } else {
        setErrorMessage(e?.message || 'Failed to create goal.');
      }
      setTxStatus('error');
    }
  }, [goalTitle, goalTarget, publicKey, buildAndSubmit]);

  // ─── Approve Goal ─────────────────────────────────────────────
  const approveGoal = useCallback(
    async (goal: Goal) => {
      setErrorMessage('');
      setTxStatus('pending');
      setTxHash('');

      try {
        let hash: string;

        if (publicKey.startsWith('GDEMO')) {
          await new Promise((r) => setTimeout(r, 1000));
          hash = 'demo_approve_' + Math.random().toString(36).slice(2, 15);
        } else {
          const contract = new StellarSdk.Contract(VAULT_CONTRACT_ID);
          const op = contract.call(
            'approve_goal',
            StellarSdk.xdr.ScVal.scvU32(goal.id),
            StellarSdk.Address.fromString(publicKey).toScVal()
          );
          hash = await buildAndSubmit(op);
        }

        setGoals((prev) =>
          prev.map((g) => (g.id === goal.id ? { ...g, approved: true } : g))
        );
        setTxHash(hash);
        setTxStatus('success');
      } catch (e: any) {
        const msg = (e?.message || e?.toString() || '').toLowerCase();
        if (msg.includes('declined') || msg.includes('rejected') || msg.includes('cancel') || msg.includes('denied')) {
          setErrorMessage('Transaction cancelled by user.');
        } else {
          setErrorMessage(e?.message || 'Failed to approve goal.');
        }
        setTxStatus('error');
      }
    },
    [publicKey, buildAndSubmit]
  );

  // ─── Disconnect ──────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setPublicKey('');
    setWalletStatus('disconnected');
    setTxStatus('idle');
    setErrorMessage('');
    setTxHash('');
    setGoals([]);
  }, []);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="app-container">
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <header className="app-header">
        <div className="logo">
          <h1>🎯 Goals Vault</h1>
        </div>
        <p className="subtitle">Shared savings goals with on-chain SYNC token rewards</p>
        <span className="network-badge">Testnet</span>
      </header>

      <main className="main-card">
        {/* ─── Config Warning ─── */}
        {!isConfigured && (
          <div className="config-warning">
            ⚠️ Contract Not Configured: Set PUBLIC_GOALS_VAULT_CONTRACT_ID in your Vercel environment variables.
          </div>
        )}

        {/* ─── Wallet Section ─── */}
        <section className="section">
          <h3 className="section-title">
            <span className="step-number">1</span>
            Connect Your Wallet
          </h3>

          {walletStatus === 'disconnected' && (
            <div className="wallet-actions">
              <button className="btn btn-primary btn-glow" onClick={connectWallet}>
                🔗 Connect Freighter
              </button>
              <button className="btn btn-ghost" onClick={connectDemo}>
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

        {/* ─── Create Goal Form ─── */}
        {walletStatus === 'connected' && (
          <section className="section">
            <h3 className="section-title">
              <span className="step-number">2</span>
              Create a Goal
            </h3>
            <div className="goal-form">
              <input
                type="text"
                placeholder="Goal title (e.g. Vacation Fund)"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="goal-input"
              />
              <input
                type="number"
                placeholder="Target amount (XLM)"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="goal-input"
                min="1"
              />
              <button
                className="btn btn-primary"
                onClick={createGoal}
                disabled={txStatus === 'pending' || !isConfigured}
              >
                {txStatus === 'pending' ? (
                  <>
                    <div className="spinner spinner-sm" />
                    Creating...
                  </>
                ) : (
                  '🎯 Create Goal'
                )}
              </button>
            </div>
          </section>
        )}

        {/* ─── Goals List ─── */}
        {goals.length > 0 && (
          <section className="section">
            <h3 className="section-title">
              <span className="step-number">3</span>
              Your Goals
            </h3>
            <div className="goals-grid">
              {goals.map((goal) => (
                <div key={goal.id} className="goal-card">
                  <p className="goal-card-title">{goal.title}</p>
                  <p className="goal-card-meta">Target: {goal.targetAmount} XLM</p>
                  <div className="goal-card-footer">
                    {goal.approved ? (
                      <span className="badge badge-approved">✅ Approved</span>
                    ) : (
                      <span className="badge badge-pending">⏳ Pending</span>
                    )}
                    {!goal.approved && (
                      <button
                        className="btn-approve"
                        onClick={() => approveGoal(goal)}
                        disabled={txStatus === 'pending'}
                      >
                        ✓ Approve Goal
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Tx Status ─── */}
        {txStatus === 'success' && txHash && (
          <div className="tx-success">
            ✅ Transaction submitted!{' '}
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              {txHash.startsWith('demo') ? txHash : `${txHash.slice(0, 12)}...`}
            </a>
          </div>
        )}

        {errorMessage && (
          <div className="tx-error">⚠️ {errorMessage}</div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Built on{' '}
          <a href="https://stellar.org" target="_blank" rel="noopener noreferrer">
            Stellar
          </a>{' '}
          · Soroban Smart Contracts · Level 4 Green Belt
        </p>
      </footer>
    </div>
  );
}
