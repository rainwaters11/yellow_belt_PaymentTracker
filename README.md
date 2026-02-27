# Couple Sync

> Link your Stellar wallets together on the blockchain.  
> A **Soroban** smart contract dApp for the Stellar Yellow Belt — Level 2 & Level 4 (Green Belt).

![Sync Successful](screenshots/sync-successful.png)

---

## Features

- **Multi-Wallet Support** — Uses `StellarWalletsKit` to offer Freighter, xBull, and Albedo wallet connections
- **Smart Contract** — Soroban `link_partners` contract stores partner pairs on-chain with Instance Storage
- **Real-Time Events** — Contract emits `SyncSuccessful` events that the frontend polls for live updates
- **Error Handling** — Three professional error states: Wallet Not Found, User Rejected, Insufficient Funds
- **Premium UI** — Dark theme with glassmorphism, animated gradient orbs, and micro-animations

### 📡 Real-Time State Sync
To satisfy the Level 2 requirement for real-time data synchronization:
- The dApp uses a `useEffect` hook to subscribe to contract events via the Stellar SDK.
- When the `SyncSuccessful` event is emitted by the Soroban contract, the frontend triggers a "Heartbeat" pulse animation on the logo without a page refresh.
---

## Wallet Options

![Wallet Options](screenshots/wallet-options.png)

The "Select Wallet" modal provides users with a choice of Stellar wallets:

| Wallet      | Description              |
|-------------|--------------------------|
| 🚀 Freighter | Browser extension wallet |
| 🐂 xBull     | Multi-platform wallet    |
| 🌟 Albedo    | Web-based wallet         |

---

## Contract ID

```text
CBTWI3DMBN4P3XVEUPKSVOSRYH6NFKYZ3RFKWA54YGBTEOA4YSO7VLOW
```
---

## Level 4 — Green Belt: Goals Vault

> Decentralized shared savings goals with on-chain SYNC token rewards and inter-contract calls.

### Contract Addresses

| Contract | Address |
|---|---|
| Goals Vault | `REPLACE_WITH_YOUR_GOALS_VAULT_CONTRACT_ID` |
| SYNC Reward Token | `REPLACE_WITH_YOUR_SYNC_TOKEN_CONTRACT_ID` |

> **How to get these IDs:** After cloning, run the deploy commands in the "Deploy to Testnet" section below,
> then replace the placeholders above and in Vercel → Settings → Environment Variables.

### Inter-Contract Architecture (Level 4 Requirement)

The `approve_goal` function in the **Goals Vault** contract makes a cross-contract call to the **SYNC Token** contract to mint 100 SYNC tokens as a reward to the goal creator. This satisfies the Level 4 inter-contract call requirement.

```
GoalsVault::approve_goal(goal_id, approver)
  └─► SyncToken::mint(goal.creator, 100)
```

### Test Goal Transaction Hash

```text
REPLACE_WITH_YOUR_TEST_GOAL_TX_HASH
```

> After you run a real `create_goal` transaction, paste the hash here and [view it on Stellar Expert](https://stellar.expert/explorer/testnet).

### Mobile Responsiveness

The Goals Dashboard (`GoalsDashboard.tsx`) is built mobile-first with a responsive CSS grid:
- **Mobile (≤640px):** Single-column layout, 44px minimum touch targets
- **Tablet/Desktop (>640px):** Auto-fill grid (`minmax(280px, 1fr)`)

The component is production-ready and fully responsive.

### Deploy Both New Contracts to Testnet

```bash
# Build all contracts (including new ones)
cargo build --target wasm32v1-none --release

# Deploy Goals Vault
stellar contract deploy \
  --wasm target/wasm32v1-none/release/goals_vault.wasm \
  --source alice \
  --network testnet
# → Copy output → paste as PUBLIC_GOALS_VAULT_CONTRACT_ID

# Deploy SYNC Token
stellar contract deploy \
  --wasm target/wasm32v1-none/release/sync_token.wasm \
  --source alice \
  --network testnet
# → Copy output → paste as PUBLIC_SYNC_TOKEN_CONTRACT_ID

# Initialize the SYNC Token (set vault as the authorized minter)
stellar contract invoke \
  --id <SYNC_TOKEN_CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- initialize \
  --minter <GOALS_VAULT_CONTRACT_ID>

# Initialize the Goals Vault
stellar contract invoke \
  --id <GOALS_VAULT_CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- initialize \
  --sync_token_id <SYNC_TOKEN_CONTRACT_ID>
```

---

## Setup Instructions

### Prerequisites

- [Rust](https://www.rust-lang.org/) (1.80+)
- [Node.js](https://nodejs.org/) (18+)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) (25+)
- `wasm32-unknown-unknown` and `wasm32v1-none` Rust targets

### 1. Clone & Install

```bash
git clone <YOUR_REPO_URL>
cd couple-sync
npm install --prefix frontend
```

### 2. Build & Test the Contract

```bash
# Build sync_token WASM first (required for cross-contract tests)
cargo build -p sync_token --target wasm32v1-none --release
# Run all unit tests (12 tests total)
cargo test --workspace
# Build all contracts
cargo build --target wasm32v1-none --release
```

### 3. Deploy to Testnet

```bash
stellar keys generate alice --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/couple_sync.wasm \
  --source alice \
  --network testnet
```

Save the returned Contract ID and update `CONTRACT_ID` in `frontend/src/components/CoupleSync.tsx`.

### 4. Run the Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

---

## Tech Stack

| Layer           | Technology                        |
|-----------------|-----------------------------------|
| Smart Contract  | Rust + Soroban SDK 25             |
| Frontend        | Astro 5 + React 19               |
| Wallets         | @creit.tech/stellar-wallets-kit   |
| Blockchain      | Stellar SDK                       |
| Network         | Stellar Testnet                   |

---

## Transaction Hash

```text
49329072fbe1ab7dde5d49888de58e168fdb75c453ffa3a90560e4044d4bcb44
```

> [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/49329072fbe1ab7dde5d49888de58e168fdb75c453ffa3a90560e4044d4bcb44)

---

## Vercel Link

```text
https://yellow-belt-payment-tracker.vercel.app/
```

---

## License

MIT
