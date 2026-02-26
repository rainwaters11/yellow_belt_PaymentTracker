#![no_std]

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, Address, Env,
};

#[contracttype]
enum DataKey {
    GoalComplete(Address, u32),
    TokenContract,
}

#[contractclient(name = "TokenClient")]
pub trait TokenContract {
    fn mint(env: Env, to: Address, amount: i128);
}

#[contract]
pub struct GoalsVault;

#[contractimpl]
impl GoalsVault {
    pub fn init(env: Env, token_contract: Address) {
        if env.storage().instance().has(&DataKey::TokenContract) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::TokenContract, &token_contract);
        env.storage().instance().extend_ttl(5000, 10000);
    }

    pub fn complete_goal(env: Env, user: Address, goal_id: u32, reward_amount: i128) {
        user.require_auth();
        if reward_amount <= 0 {
            panic!("reward must be positive");
        }

        let goal_key = DataKey::GoalComplete(user.clone(), goal_id);
        if env.storage().instance().has(&goal_key) {
            panic!("goal already completed");
        }
        env.storage().instance().set(&goal_key, &true);

        let token_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap_or_else(|| panic!("token contract not set"));

        let token = TokenClient::new(&env, &token_contract);
        token.mint(&user, &reward_amount);

        env.events()
            .publish((symbol_short!("goal"),), (user, goal_id, reward_amount));
        env.storage().instance().extend_ttl(5000, 10000);
    }

    pub fn is_goal_complete(env: Env, user: Address, goal_id: u32) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::GoalComplete(user, goal_id))
            .unwrap_or(false)
    }
}

mod test;
