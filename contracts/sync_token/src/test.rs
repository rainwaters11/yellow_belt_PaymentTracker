#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_initialize_and_mint() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SyncToken, ());
    let client = SyncTokenClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let to = Address::generate(&env);

    client.initialize(&minter);
    client.mint(&to, &100);

    assert_eq!(client.balance(&to), 100);
    assert_eq!(client.total_supply(), 100);
}

#[test]
fn test_mint_accumulates() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SyncToken, ());
    let client = SyncTokenClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let to = Address::generate(&env);

    client.initialize(&minter);
    client.mint(&to, &60);
    client.mint(&to, &40);

    assert_eq!(client.balance(&to), 100);
}

#[test]
fn test_balance_default_zero() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SyncToken, ());
    let client = SyncTokenClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    client.initialize(&minter);

    let nobody = Address::generate(&env);
    assert_eq!(client.balance(&nobody), 0);
}

#[test]
#[should_panic]
fn test_double_initialize_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SyncToken, ());
    let client = SyncTokenClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    client.initialize(&minter);
    client.initialize(&minter);
}
