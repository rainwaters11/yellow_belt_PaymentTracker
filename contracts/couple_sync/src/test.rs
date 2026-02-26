#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_init() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CoupleSync, ());
    let client = CoupleSyncClient::new(&env, &contract_id);

    let alice = Address::generate(&env);

    // Initial state should not be synced
    assert!(!client.is_synced(&alice));
    // Initial state should not have a partner
    assert_eq!(client.get_partner(&alice), None);
}

#[test]
fn test_link_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CoupleSync, ());
    let client = CoupleSyncClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Alice links Bob
    client.link_partners(&alice, &bob);
    assert!(!client.is_synced(&alice));
    assert!(!client.is_synced(&bob));

    // Bob links Alice
    client.link_partners(&bob, &alice);
    
    // Now both should be synced
    assert!(client.is_synced(&alice));
    assert!(client.is_synced(&bob));
}

#[test]
#[should_panic]
fn test_double_sync_rejection() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CoupleSync, ());
    let client = CoupleSyncClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    // Alice links Bob successfully
    client.link_partners(&alice, &bob);
    
    // Re-linking a different partner should be rejected/panic
    client.link_partners(&alice, &charlie);
}
