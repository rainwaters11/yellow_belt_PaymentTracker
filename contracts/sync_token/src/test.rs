#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_mint_and_balance() {
    let env = Env::default();
    let contract_id = env.register(SyncToken, ());
    let client = SyncTokenClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    assert_eq!(client.balance(&alice), 0);

    client.mint(&alice, &25);
    assert_eq!(client.balance(&alice), 25);

    client.mint(&alice, &5);
    assert_eq!(client.balance(&alice), 30);
}
