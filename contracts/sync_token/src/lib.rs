#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
pub enum DataKey {
    Minter,
    Balance(Address),
    TotalSupply,
}

#[contract]
pub struct SyncToken;

#[contractimpl]
impl SyncToken {
    /// Sets the authorized minter. Panics if already initialized.
    pub fn initialize(env: Env, minter: Address) {
        if env.storage().persistent().has(&DataKey::Minter) {
            panic!("already initialized");
        }
        env.storage()
            .persistent()
            .set(&DataKey::Minter, &minter);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Minter, 50_000, 100_000);
    }

    /// Mints `amount` tokens to `to`. Only callable by the stored minter.
    pub fn mint(env: Env, to: Address, amount: i128) {
        let minter: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Minter)
            .expect("unauthorized");
        minter.require_auth();

        let balance_key = DataKey::Balance(to.clone());
        let current: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);
        let new_balance = current + amount;
        env.storage()
            .persistent()
            .set(&balance_key, &new_balance);
        env.storage()
            .persistent()
            .extend_ttl(&balance_key, 50_000, 100_000);

        let total: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        let new_total = total + amount;
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &new_total);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::TotalSupply, 50_000, 100_000);
    }

    /// Returns the token balance for `addr`, defaulting to 0.
    pub fn balance(env: Env, addr: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(addr))
            .unwrap_or(0)
    }

    /// Returns the total token supply, defaulting to 0.
    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }
}

mod test;
