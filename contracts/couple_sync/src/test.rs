#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_link_and_sync() {
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

    // Bob links Alice — now both are synced
    client.link_partners(&bob, &alice);
    assert!(client.is_synced(&alice));
    assert!(client.is_synced(&bob));
}

#[test]
fn test_one_sided_not_synced() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CoupleSync, ());
    let client = CoupleSyncClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Only Alice links Bob
    client.link_partners(&alice, &bob);
    assert!(!client.is_synced(&alice));
    assert!(!client.is_synced(&bob));
}

#[test]
fn test_get_partner() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CoupleSync, ());
    let client = CoupleSyncClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // No partner set yet
    assert_eq!(client.get_partner(&alice), None);

    // Alice links Bob
    client.link_partners(&alice, &bob);
    assert_eq!(client.get_partner(&alice), Some(bob.clone()));

    // Bob has no partner yet
    assert_eq!(client.get_partner(&bob), None);
}

#[test]
fn test_mismatched_partners() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CoupleSync, ());
    let client = CoupleSyncClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    // Alice links Bob, Bob links Charlie (mismatch)
    client.link_partners(&alice, &bob);
    client.link_partners(&bob, &charlie);

    assert!(!client.is_synced(&alice));
    assert!(!client.is_synced(&bob));
}
