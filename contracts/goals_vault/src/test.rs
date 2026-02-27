#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_requires_both_partner_approvals_before_mint() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(SyncTokenForTest, ());
    let token_client = SyncTokenForTestClient::new(&env, &token_id);

    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    vault.init(&token_id);
    vault.create_goal(&1, &alice, &bob, &50, &0);

    vault.approve_goal(&alice, &1);
    assert!(vault.is_goal_approved_by(&1, &alice));
    assert!(!vault.is_goal_approved_by(&1, &bob));
    assert!(!vault.is_goal_complete(&1));
    assert_eq!(token_client.balance(&alice), 0);
    assert_eq!(token_client.balance(&bob), 0);

    vault.approve_goal(&bob, &1);
    assert!(vault.is_goal_complete(&1));
    assert_eq!(token_client.balance(&alice), 50);
    assert_eq!(token_client.balance(&bob), 50);
}

#[test]
#[should_panic]
fn test_timelock_blocks_early_approval() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(SyncTokenForTest, ());
    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    vault.init(&token_id);
    vault.create_goal(&7, &alice, &bob, &10, &1);

    // Default test ledger timestamp starts at 0, so goal is still locked.
    vault.approve_goal(&alice, &7);
}

#[test]
#[should_panic]
fn test_cannot_approve_completed_goal_again() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(SyncTokenForTest, ());
    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    vault.init(&token_id);
    vault.create_goal(&11, &alice, &bob, &25, &0);
    vault.approve_goal(&alice, &11);
    vault.approve_goal(&bob, &11);

    // Goal already minted/completed; any new approval should fail.
    vault.approve_goal(&alice, &11);
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
