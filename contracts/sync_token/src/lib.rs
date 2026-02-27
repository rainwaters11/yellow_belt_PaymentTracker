#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
enum DataKey {
    Balance(Address),
}

#[contract]
pub struct SyncToken;

#[contractimpl]
impl SyncToken {
    // SEP-41 metadata-style methods
    pub fn name(env: Env) -> String {
        String::from_str(&env, "SYNC")
    }

    pub fn symbol(env: Env) -> String {
        String::from_str(&env, "SYNC")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let key = DataKey::Balance(to);
        let current: i128 = env.storage().instance().get(&key).unwrap_or(0);
        env.storage().instance().set(&key, &(current + amount));
        env.storage().instance().extend_ttl(5000, 10000);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let from_key = DataKey::Balance(from.clone());
        let to_key = DataKey::Balance(to);

        let from_balance: i128 = env.storage().instance().get(&from_key).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }

        let to_balance: i128 = env.storage().instance().get(&to_key).unwrap_or(0);
        env.storage().instance().set(&from_key, &(from_balance - amount));
        env.storage().instance().set(&to_key, &(to_balance + amount));
        env.storage().instance().extend_ttl(5000, 10000);
    }

    pub fn balance(env: Env, user: Address) -> i128 {
        let key = DataKey::Balance(user);
        env.storage().instance().get(&key).unwrap_or(0)
    }
}

mod test;
