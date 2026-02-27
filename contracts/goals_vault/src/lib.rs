#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env,
};

mod sync_token {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/sync_token.wasm"
    );
}

const REWARD_AMOUNT: i128 = 100;

#[contracttype]
#[derive(Clone)]
pub struct Goal {
    pub creator: Address,
    pub title: soroban_sdk::String,
    pub target_amount: i128,
    pub current_amount: i128,
    pub approved: bool,
}

#[contracttype]
pub enum DataKey {
    Goal(u32),
    GoalCount,
    SyncTokenId,
}

#[contract]
pub struct GoalsVault;

#[contractimpl]
impl GoalsVault {
    /// Stores the SYNC Token contract address. Panics if already initialized.
    pub fn initialize(env: Env, sync_token_id: Address) {
        if env.storage().instance().has(&DataKey::SyncTokenId) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&DataKey::SyncTokenId, &sync_token_id);
        env.storage().instance().extend_ttl(5000, 10000);
    }

    /// Creates a new goal and returns its ID.
    pub fn create_goal(
        env: Env,
        creator: Address,
        title: soroban_sdk::String,
        target_amount: i128,
    ) -> u32 {
        creator.require_auth();

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GoalCount)
            .unwrap_or(0u32);

        let goal = Goal {
            creator: creator.clone(),
            title,
            target_amount,
            current_amount: 0,
            approved: false,
        };

        env.storage()
            .instance()
            .set(&DataKey::Goal(id), &goal);
        env.storage()
            .instance()
            .set(&DataKey::GoalCount, &(id + 1));

        env.events()
            .publish((symbol_short!("goal"),), (id, creator));

        env.storage().instance().extend_ttl(5000, 10000);

        id
    }

    /// Approves a goal and mints SYNC token reward to the creator.
    pub fn approve_goal(env: Env, goal_id: u32, approver: Address) {
        approver.require_auth();

        let mut goal: Goal = env
            .storage()
            .instance()
            .get(&DataKey::Goal(goal_id))
            .expect("goal not found");

        if goal.approved {
            panic!("already approved");
        }

        goal.approved = true;
        env.storage()
            .instance()
            .set(&DataKey::Goal(goal_id), &goal);

        let sync_token_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::SyncTokenId)
            .expect("not initialized");

        let client = sync_token::Client::new(&env, &sync_token_id);
        client.mint(&goal.creator, &REWARD_AMOUNT);

        env.events()
            .publish((symbol_short!("approved"),), (goal_id, goal.creator));

        env.storage().instance().extend_ttl(5000, 10000);
    }

    /// Returns the goal for `goal_id`, or None if it doesn't exist.
    pub fn get_goal(env: Env, goal_id: u32) -> Option<Goal> {
        env.storage()
            .instance()
            .get(&DataKey::Goal(goal_id))
    }
}

mod test;
