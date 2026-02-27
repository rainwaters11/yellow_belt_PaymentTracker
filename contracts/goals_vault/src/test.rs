#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_create_goal() {
    let env = Env::default();
    env.mock_all_auths();

    // Use a dummy address for sync_token since we won't call approve here
    let fake_token = Address::generate(&env);
    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);

    vault.initialize(&fake_token);

    let creator = Address::generate(&env);
    let title = String::from_str(&env, "Save for vacation");
    let id = vault.create_goal(&creator, &title, &500);

    assert_eq!(id, 0);

    let goal = vault.get_goal(&0).unwrap();
    assert_eq!(goal.title, String::from_str(&env, "Save for vacation"));
    assert_eq!(goal.target_amount, 500);
    assert!(!goal.approved);
}

#[test]
fn test_approve_goal_mints_reward() {
    let env = Env::default();
    env.mock_all_auths();

    // Register both contracts
    let token_id = env.register(sync_token::WASM, ());
    let token = sync_token::Client::new(&env, &token_id);

    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);

    // Initialize sync_token with vault as the minter
    token.initialize(&vault_id);

    // Initialize vault with the token address
    vault.initialize(&token_id);

    // Create a goal
    let creator = Address::generate(&env);
    let title = String::from_str(&env, "Emergency fund");
    vault.create_goal(&creator, &title, &1000);

    // Approve the goal
    let approver = Address::generate(&env);
    vault.approve_goal(&0, &approver);

    // Assertions
    assert_eq!(token.balance(&creator), 100);
    assert!(vault.get_goal(&0).unwrap().approved);
}

#[test]
#[should_panic(expected = "already approved")]
fn test_double_approve_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(sync_token::WASM, ());
    let token = sync_token::Client::new(&env, &token_id);

    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);

    token.initialize(&vault_id);
    vault.initialize(&token_id);

    let creator = Address::generate(&env);
    vault.create_goal(&creator, &String::from_str(&env, "Goal"), &100);

    let approver = Address::generate(&env);
    vault.approve_goal(&0, &approver);
    vault.approve_goal(&0, &approver);
}

#[test]
#[should_panic(expected = "goal not found")]
fn test_approve_nonexistent_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let fake_token = Address::generate(&env);
    let vault_id = env.register(GoalsVault, ());
    let vault = GoalsVaultClient::new(&env, &vault_id);

    vault.initialize(&fake_token);

    let approver = Address::generate(&env);
    vault.approve_goal(&99, &approver);
}
