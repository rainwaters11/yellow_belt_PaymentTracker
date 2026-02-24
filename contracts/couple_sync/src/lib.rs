#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

#[contracttype]
enum DataKey {
    Partner(Address),
}

#[contract]
pub struct CoupleSync;

#[contractimpl]
impl CoupleSync {
    /// Links the caller with their partner.
    /// Both partners must call this function with each other's address
    /// for the sync to be considered complete.
    pub fn link_partners(env: Env, caller: Address, partner: Address) {
        caller.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::Partner(caller.clone()), &partner);

        // Extend the TTL so storage doesn't expire quickly on testnet
        env.storage().instance().extend_ttl(5000, 10000);

        // Check if the reverse mapping also exists (both sides linked)
        let synced = Self::is_synced_internal(&env, &caller, &partner);

        // Publish a SyncSuccessful event when both partners have linked
        if synced {
            env.events().publish(
                (symbol_short!("sync"),),
                (caller, partner),
            );
        }
    }

    /// Returns true if both user->partner and partner->user mappings exist and match.
    pub fn is_synced(env: Env, user: Address) -> bool {
        let partner: Option<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Partner(user.clone()));

        match partner {
            Some(p) => Self::is_synced_internal(&env, &user, &p),
            None => false,
        }
    }

    /// Returns the partner address for a given user, if one has been set.
    pub fn get_partner(env: Env, user: Address) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Partner(user))
    }

    fn is_synced_internal(env: &Env, user: &Address, partner: &Address) -> bool {
        let reverse: Option<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Partner(partner.clone()));

        match reverse {
            Some(ref reverse_partner) => reverse_partner == user,
            None => false,
        }
    }
}

mod test;
