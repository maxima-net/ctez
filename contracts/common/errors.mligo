(* common *)
[@inline] let tez_in_transaction_disallowed = "TEZ_IN_TRANSACTION_DISALLOWED"
[@inline] let incorrect_subtraction = "INCORRECT_SUBTRACTION"

(* ctez2 *)
[@inline] let deadline_has_passed = "DEADLINE_HAS_PASSED"
[@inline] let insufficient_liquidity_created = "INSUFFICIENT_LIQUIDITY_CREATED"
[@inline] let ctez_fa12_address_already_set = "CTEZ_FA12_ADDRESS_ALREADY_SET"
[@inline] let insufficient_tokens_bought = "INSUFFICIENT_TOKENS_BOUGHT"
[@inline] let insufficient_tokens_liquidity = "INSUFFICIENT_TOKENS_LIQUIDITY"
[@inline] let insufficient_liquidity = "INSUFFICIENT_LIQUIDITY"
[@inline] let insufficient_self_received = "INSUFFICIENT_SELF_RECEIVED"
[@inline] let insufficient_proceeds_received = "INSUFFICIENT_PROCEEDS_RECEIVED"
[@inline] let insufficient_subsidy_received = "INSUFFICIENT_SUBSIDY_RECEIVED"
[@inline] let small_sell_amount = "SMALL_SELL_AMOUNT"
[@inline] let proceeds_decreased = "PROCEEDS_DECREASED"
[@inline] let subsidy_decreased = "SUBSIDY_DECREASED"
[@inline] let oven_already_exists = "OVEN_ALREADY_EXISTS"
[@inline] let oven_not_exists = "OVEN_NOT_EXISTS"
[@inline] let only_oven_can_call = "ONLY_OVEN_CAN_CALL"
[@inline] let excessive_tez_withdrawal = "EXCESSIVE_TEZ_WITHDRAWAL"
[@inline] let excessive_ctez_burning = "EXCESSIVE_CTEZ_BURNING"
[@inline] let excessive_ctez_minting = "EXCESSIVE_CTEZ_MINTING"
[@inline] let missing_withdraw_entrypoint = "MISSING_WITHDRAW_ENTRYPOINT"
[@inline] let missing_mint_or_burn_entrypoint = "MISSING_MINT_OR_BURN_ENTRYPOINT"
[@inline] let not_undercollateralized = "NOT_UNDERCOLLATERALIZED"
[@inline] let missing_total_supply_view = "MISSING_TOTAL_SUPPLY_VIEW"
[@inline] let insufficient_tez_in_oven = "INSUFFICIENT_TEZ_IN_OVEN"

(* oven *)
[@inline] let only_main_contract_can_call = "ONLY_MAIN_CONTRACT_CAN_CALL"
[@inline] let only_owner_can_call = "ONLY_OWNER_CAN_CALL"
[@inline] let unauthorized_depositor = "UNAUTHORIZED_DEPOSITOR"
[@inline] let missing_deposit_entrypoint = "MISSING_DEPOSIT_ENTRYPOINT"
[@inline] let set_any_off_first = "SET_ANY_OFF_FIRST"