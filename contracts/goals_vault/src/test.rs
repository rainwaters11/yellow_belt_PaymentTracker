#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_complete_goal_mints_sync_token() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(SyncTokenForTest, ());
    let token_client = SyncTokenForTestClient::new(&env, &token_id);

    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);

    vault.init(&token_id);

    let user = Address::generate(&env);
    assert_eq!(token_client.balance(&user), 0);

    vault.complete_goal(&user, &1, &50);

    assert!(vault.is_goal_complete(&user, &1));
    assert_eq!(token_client.balance(&user), 50);
}

#[test]
#[should_panic]
fn test_cannot_complete_same_goal_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(SyncTokenForTest, ());
    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);
    let user = Address::generate(&env);

    vault.init(&token_id);
    vault.complete_goal(&user, &7, &10);
    vault.complete_goal(&user, &7, &10);
}

#[cfg(test)]
mod token_stub {
    use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

    #[contracttype]
    enum DataKey {
        Balance(Address),
    }

    #[contract]
    pub struct SyncTokenForTest;

    #[contractimpl]
    impl SyncTokenForTest {
        pub fn mint(env: Env, to: Address, amount: i128) {
            let key = DataKey::Balance(to);
            let current: i128 = env.storage().instance().get(&key).unwrap_or(0);
            env.storage().instance().set(&key, &(current + amount));
        }

        pub fn balance(env: Env, user: Address) -> i128 {
            env.storage()
                .instance()
                .get(&DataKey::Balance(user))
                .unwrap_or(0)
        }
    }
}

use token_stub::{SyncTokenForTest, SyncTokenForTestClient};
