#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_metadata() {
    let env = Env::default();
    let contract_id = env.register(SyncToken, ());
    let client = SyncTokenClient::new(&env, &contract_id);

    assert_eq!(client.name(), String::from_str(&env, "SYNC"));
    assert_eq!(client.symbol(), String::from_str(&env, "SYNC"));
    assert_eq!(client.decimals(), 7);
}

#[test]
fn test_mint_transfer_and_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SyncToken, ());
    let client = SyncTokenClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    assert_eq!(client.balance(&alice), 0);
    assert_eq!(client.balance(&bob), 0);

    client.mint(&alice, &25);
    assert_eq!(client.balance(&alice), 25);

    client.transfer(&alice, &bob, &7);
    assert_eq!(client.balance(&alice), 18);
    assert_eq!(client.balance(&bob), 7);
}
