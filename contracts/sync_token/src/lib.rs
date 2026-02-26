#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
enum DataKey {
    Balance(Address),
}

#[contract]
pub struct SyncToken;

#[contractimpl]
impl SyncToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let key = DataKey::Balance(to);
        let current: i128 = env.storage().instance().get(&key).unwrap_or(0);
        env.storage().instance().set(&key, &(current + amount));
        env.storage().instance().extend_ttl(5000, 10000);
    }

    pub fn balance(env: Env, user: Address) -> i128 {
        let key = DataKey::Balance(user);
        env.storage().instance().get(&key).unwrap_or(0)
    }
}

mod test;
