#![no_std]

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, Address, Env,
};

#[derive(Clone)]
#[contracttype]
pub struct Goal {
    pub partner_a: Address,
    pub partner_b: Address,
    pub reward_amount: i128,
    pub unlock_timestamp: u64,
    pub minted: bool,
}

#[contracttype]
enum DataKey {
    Goal(u32),
    Approval(u32, Address),
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

    pub fn create_goal(
        env: Env,
        goal_id: u32,
        partner_a: Address,
        partner_b: Address,
        reward_amount: i128,
        unlock_timestamp: u64,
    ) {
        if reward_amount <= 0 {
            panic!("reward must be positive");
        }
        if partner_a == partner_b {
            panic!("partners must be different");
        }

        let key = DataKey::Goal(goal_id);
        if env.storage().instance().has(&key) {
            panic!("goal already exists");
        }

        let goal = Goal {
            partner_a,
            partner_b,
            reward_amount,
            unlock_timestamp,
            minted: false,
        };

        env.storage().instance().set(&key, &goal);
        env.storage().instance().extend_ttl(5000, 10000);
    }

    pub fn approve_goal(env: Env, approver: Address, goal_id: u32) {
        approver.require_auth();

        let goal_key = DataKey::Goal(goal_id);
        let mut goal: Goal = env
            .storage()
            .instance()
            .get(&goal_key)
            .unwrap_or_else(|| panic!("goal not found"));

        if goal.minted {
            panic!("goal already completed");
        }

        if approver != goal.partner_a && approver != goal.partner_b {
            panic!("approver is not a goal partner");
        }

        let now = env.ledger().timestamp();
        if now < goal.unlock_timestamp {
            panic!("goal is still time-locked");
        }

        env.storage()
            .instance()
            .set(&DataKey::Approval(goal_id, approver), &true);

        let partner_a_approved: bool = env
            .storage()
            .instance()
            .get(&DataKey::Approval(goal_id, goal.partner_a.clone()))
            .unwrap_or(false);
        let partner_b_approved: bool = env
            .storage()
            .instance()
            .get(&DataKey::Approval(goal_id, goal.partner_b.clone()))
            .unwrap_or(false);

        if partner_a_approved && partner_b_approved {
            let token_contract: Address = env
                .storage()
                .instance()
                .get(&DataKey::TokenContract)
                .unwrap_or_else(|| panic!("token contract not set"));

            let token = TokenClient::new(&env, &token_contract);
            token.mint(&goal.partner_a, &goal.reward_amount);
            token.mint(&goal.partner_b, &goal.reward_amount);

            goal.minted = true;
            env.storage().instance().set(&goal_key, &goal);

            env.events().publish(
                (symbol_short!("goal"),),
                (goal_id, goal.partner_a, goal.partner_b, goal.reward_amount),
            );
        }

        env.storage().instance().extend_ttl(5000, 10000);
    }

    pub fn is_goal_complete(env: Env, goal_id: u32) -> bool {
        let goal: Goal = env
            .storage()
            .instance()
            .get(&DataKey::Goal(goal_id))
            .unwrap_or_else(|| panic!("goal not found"));
        goal.minted
    }

    pub fn is_goal_approved_by(env: Env, goal_id: u32, user: Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Approval(goal_id, user))
            .unwrap_or(false)
    }
}

mod test;
