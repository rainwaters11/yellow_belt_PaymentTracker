import './GoalsDashboard.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import freighterApi from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';

type GoalItem = {
  id: number;
  name: string;
  timelockHours: number;
  unlockTimestamp: number;
  reward: number;
  completeTx?: string;
};

const NETWORK = import.meta.env.PUBLIC_NETWORK || 'TESTNET';
const SOROBAN_URL = import.meta.env.PUBLIC_SOROBAN_URL || 'https://soroban-testnet.stellar.org';
const NETWORKS: Record<string, string> = {
  TESTNET: 'Test SDF Network ; September 2015',
  FUTURENET: 'Test SDF Future Network ; October 2022',
  PUBLIC: 'Public Global Stellar Network ; September 2015',
};
const NETWORK_PASSPHRASE = NETWORKS[NETWORK] || NETWORKS.TESTNET;

const GOALS_VAULT_CONTRACT_ID = import.meta.env.PUBLIC_GOALS_VAULT_CONTRACT_ID || '';
const SYNC_TOKEN_CONTRACT_ID = import.meta.env.PUBLIC_SYNC_TOKEN_CONTRACT_ID || '';

export default function GoalsDashboard() {
  const [walletAddress, setWalletAddress] = useState('');
  const [syncBalance, setSyncBalance] = useState<number | null>(null);
  const [goalName, setGoalName] = useState('');
  const [timelockHours, setTimelockHours] = useState(24);
  const [partnerAddress, setPartnerAddress] = useState('');
  const [rewardAmount, setRewardAmount] = useState(10);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const hasContracts = Boolean(
    GOALS_VAULT_CONTRACT_ID.trim().length > 0 && SYNC_TOKEN_CONTRACT_ID.trim().length > 0,
  );

  const averageProgress = useMemo(() => {
    if (!goals.length) return 0;
    const now = Math.floor(Date.now() / 1000);
    const completed = goals.filter((goal) => goal.completeTx || goal.unlockTimestamp <= now).length;
    return Math.round((completed / goals.length) * 100);
  }, [goals]);

  const invokeContract = useCallback(
    async (contractId: string, method: string, args: StellarSdk.xdr.ScVal[]) => {
      if (!walletAddress) {
        throw new Error('Connect wallet first.');
      }

      const server = new StellarSdk.rpc.Server(SOROBAN_URL);
      const sourceAccount = await server.getAccount(walletAddress);
      const contract = new StellarSdk.Contract(contractId);

      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '10000',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(sim)) {
        throw new Error(`Simulation failed: ${sim.error}`);
      }

      const assembledTx = StellarSdk.rpc.assembleTransaction(tx, sim as any);
      const assembledTxXdr = assembledTx.build().toXDR();

      const signResult = await freighterApi.signTransaction(assembledTxXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if ((signResult as any).error) {
        throw new Error((signResult as any).error);
      }

      const signedXdr = (signResult as any).signedTxXdr || (signResult as any).signedXDR;
      const submitResponse = await server.sendTransaction(
        StellarSdk.TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE) as any,
      );

      if (submitResponse.status === 'ERROR' || (submitResponse as any).errorResult) {
        throw new Error('Transaction failed on chain.');
      }

      return submitResponse.hash;
    },
    [walletAddress],
  );

  const fetchTokenBalance = useCallback(async () => {
    if (!walletAddress || !SYNC_TOKEN_CONTRACT_ID) {
      setSyncBalance(null);
      return;
    }

    try {
      const server = new StellarSdk.rpc.Server(SOROBAN_URL);
      const sourceAccount = await server.getAccount(walletAddress);
      const contract = new StellarSdk.Contract(SYNC_TOKEN_CONTRACT_ID);

      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '10000',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('balance', new StellarSdk.Address(walletAddress).toScVal()))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(sim)) {
        throw new Error(sim.error);
      }

      const retval = (sim as any).result?.retval;
      if (!retval) {
        setSyncBalance(0);
        return;
      }

      const nativeVal = StellarSdk.scValToNative(retval as any) as number;
      setSyncBalance(Number(nativeVal));
    } catch (err) {
      console.warn('[GoalsDashboard] failed to fetch SYNC balance', err);
      setSyncBalance(null);
    }
  }, [walletAddress]);

  const connectWallet = useCallback(async () => {
    try {
      setStatus('Connecting wallet...');
      const accessResult = await freighterApi.requestAccess();
      if ((accessResult as any)?.error) {
        throw new Error((accessResult as any).error);
      }

      const addrResult = await freighterApi.getAddress();
      if ((addrResult as any)?.error || !(addrResult as any)?.address) {
        throw new Error('Failed to get wallet address from Freighter.');
      }

      setWalletAddress((addrResult as any).address);
      setStatus('Wallet connected.');
    } catch (err: any) {
      setStatus(err?.message || 'Wallet connection failed.');
    }
  }, []);

  const createGoal = useCallback(async () => {
    if (!hasContracts) {
      setStatus('Missing contract IDs. Configure PUBLIC_GOALS_VAULT_CONTRACT_ID and PUBLIC_SYNC_TOKEN_CONTRACT_ID.');
      return;
    }
    if (!goalName.trim()) {
      setStatus('Please enter a goal name.');
      return;
    }
    if (!partnerAddress || !partnerAddress.startsWith('G') || partnerAddress.length !== 56) {
      setStatus('Enter a valid partner public key (G..., 56 chars).');
      return;
    }

    try {
      setIsBusy(true);
      const newGoalId = Date.now();
      const unlockTimestamp = Math.floor(Date.now() / 1000) + Math.max(0, timelockHours) * 3600;

      setStatus('Creating goal on-chain...');
      await invokeContract('' + GOALS_VAULT_CONTRACT_ID, 'create_goal', [
        StellarSdk.nativeToScVal(newGoalId, { type: 'u32' }),
        new StellarSdk.Address(walletAddress).toScVal(),
        new StellarSdk.Address(partnerAddress).toScVal(),
        StellarSdk.nativeToScVal(rewardAmount, { type: 'i128' }),
        StellarSdk.nativeToScVal(unlockTimestamp, { type: 'u64' }),
      ]);

      setGoals((prev) => [
        ...prev,
        {
          id: newGoalId,
          name: goalName.trim(),
          timelockHours,
          unlockTimestamp,
          reward: rewardAmount,
        },
      ]);
      setGoalName('');
      setStatus('Goal created. Wait until timelock expires, then approve completion.');
    } catch (err: any) {
      setStatus(err?.message || 'Failed to create goal.');
    } finally {
      setIsBusy(false);
    }
  }, [goalName, hasContracts, invokeContract, partnerAddress, rewardAmount, timelockHours, walletAddress]);

  const completeGoal = useCallback(
    async (goalId: number) => {
      try {
        setIsBusy(true);
        setStatus('Approving goal on-chain...');
        const txHash = await invokeContract('' + GOALS_VAULT_CONTRACT_ID, 'approve_goal', [
          new StellarSdk.Address(walletAddress).toScVal(),
          StellarSdk.nativeToScVal(goalId, { type: 'u32' }),
        ]);

        setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, completeTx: txHash } : goal)));
        setStatus('Goal approval submitted. Once both partners approve, SYNC minting executes via vault inter-contract call.');
        await fetchTokenBalance();
      } catch (err: any) {
        setStatus(err?.message || 'Failed to complete goal.');
      } finally {
        setIsBusy(false);
      }
    },
    [fetchTokenBalance, invokeContract, walletAddress],
  );

  useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  return (
    <section className="goals-dashboard" aria-labelledby="goals-dashboard-title">
      <div className="goals-dashboard__header">
        <h2 id="goals-dashboard-title">Goals Dashboard</h2>
        <p>Create custom goals, apply time-locks, and approve completion to mint SYNC rewards.</p>
      </div>

      {!hasContracts && (
        <div className="goals-dashboard__warning" role="status">
          Missing contract IDs. Set <code>PUBLIC_GOALS_VAULT_CONTRACT_ID</code> and <code>PUBLIC_SYNC_TOKEN_CONTRACT_ID</code>.
        </div>
      )}

      <div className="goals-dashboard__summary">
        <div>
          <span>SYNC Balance</span>
          <strong>{syncBalance === null ? '—' : syncBalance}</strong>
        </div>
        <div>
          <span>Goal Progress</span>
          <strong>{averageProgress}%</strong>
        </div>
      </div>

      <div className="goals-dashboard__actions">
        {!walletAddress ? (
          <button className="goals-dashboard__btn" onClick={connectWallet} disabled={isBusy}>
            Connect Wallet
          </button>
        ) : (
          <p className="goals-dashboard__wallet">Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}</p>
        )}
      </div>

      <div className="goals-dashboard__form">
        <h3>Create Goal</h3>
        <label>
          Goal name
          <input
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="e.g. Anniversary Trip"
          />
        </label>
        <label>
          Time-Lock (hours)
          <input
            type="number"
            min={0}
            value={timelockHours}
            onChange={(e) => setTimelockHours(Number(e.target.value))}
          />
        </label>
        <label>
          Partner address
          <input
            value={partnerAddress}
            onChange={(e) => setPartnerAddress(e.target.value.trim())}
            placeholder="G..."
          />
        </label>
        <label>
          Reward (SYNC)
          <input
            type="number"
            min={1}
            value={rewardAmount}
            onChange={(e) => setRewardAmount(Number(e.target.value))}
          />
        </label>
        <button className="goals-dashboard__btn" onClick={createGoal} disabled={isBusy || !walletAddress}>
          Create Goal
        </button>
      </div>

      <ul className="goals-dashboard__list">
        {goals.length === 0 && <li className="goals-dashboard__item">No goals yet. Create your first goal above.</li>}
        {goals.map((goal) => (
          <li key={goal.id} className="goals-dashboard__item">
            <div className="goals-dashboard__row">
              <span>{goal.name}</span>
              <span>{goal.reward} SYNC</span>
            </div>
            <small>Unlocks at UNIX {goal.unlockTimestamp} ({goal.timelockHours}h time-lock)</small>
            <div className="goals-dashboard__row goals-dashboard__row--actions">
              <button
                className="goals-dashboard__btn goals-dashboard__btn--small"
                onClick={() => completeGoal(goal.id)}
                disabled={isBusy || !walletAddress}
              >
                Complete Goal
              </button>
              {goal.completeTx && (
                <a href={`https://stellar.expert/explorer/testnet/tx/${goal.completeTx}`} target="_blank" rel="noreferrer">
                  Tx →
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {status && <p className="goals-dashboard__status">{status}</p>}
    </section>
  );
}
