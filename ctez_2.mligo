#include "oven_types.mligo"
#include "stdctez.mligo"
#import "half_dex.mligo" "Half_dex"
#import "context.mligo" "Context"
#import "errors.mligo" "Errors"

type add_tez_liquidity = { 
  owner : address;
  min_liquidity : nat;
  deadline : timestamp;
}

type add_ctez_liquidity = { 
  owner : address;
  amount_deposited : nat;
  min_liquidity : nat;
  deadline : timestamp;
}

type tez_to_ctez = {
  [@annot:to]
  to_: address; 
  min_ctez_bought : nat;
  deadline : timestamp
}

type ctez_to_tez = {
  [@annot:to]
  to_: address; 
  ctez_sold : nat;
  min_tez_bought : nat;
  deadline : timestamp
}

type create_oven = {
  id : nat; 
  delegate : key_hash option; 
  depositors : depositors;
}

type liquidate = { 
  handle : oven_handle; 
  quantity : nat; 
  [@annot:to]
  to_ : unit contract;
}

type mint_or_burn = { 
  id : nat; 
  quantity : int;
}

type oven = { 
  tez_balance : tez;
  ctez_outstanding : nat;
  address : address;
  fee_index : nat; (* TODO: check type *)
}

type withdraw = { 
  id : nat; 
  amount : tez; 
  [@annot:to] 
  to_ : unit contract 
}

type storage = { 
  ovens : (oven_handle, oven) big_map;
  last_update : timestamp;
  sell_ctez : Half_dex.t;
  sell_tez  : Half_dex.t;
  context : Context.t;
}

type result = storage with_operations

#include "oven.mligo"

(* Functions *)

let get_oven (handle : oven_handle) (s : storage) : oven =
  match Big_map.find_opt handle s.ovens with
  | None -> (failwith Errors.oven_not_exists : oven)
  | Some oven -> 
    (* Adjust the amount of outstanding ctez in the oven, record the fee index at that time. *)
    let new_fee_index = s.sell_ctez.fee_index * s.sell_tez.fee_index in
    let ctez_outstanding = (oven.ctez_outstanding * new_fee_index) / oven.fee_index in 
    let new_fee_index = if oven.ctez_outstanding > 0n 
      then ceil_div (ctez_outstanding * oven.fee_index) oven.ctez_outstanding 
      else new_fee_index in 
    {oven with fee_index = new_fee_index ; ctez_outstanding = ctez_outstanding}

let is_under_collateralized (oven : oven) (target : nat) : bool =
  (15n * oven.tez_balance) < (16n * Float64.mul oven.ctez_outstanding target) * 1mutez

let get_oven_withdraw (oven_address : address) : (tez * (unit contract)) contract =
  match (Tezos.get_entrypoint_opt "%oven_withdraw" oven_address : (tez * (unit contract)) contract option) with
  | None -> (failwith Errors.missing_withdraw_entrypoint : (tez * (unit contract)) contract)
  | Some c -> c

let get_ctez_mint_or_burn (fa12_address : address) : (int * address) contract =
  match (Tezos.get_entrypoint_opt  "%mintOrBurn"  fa12_address : ((int * address) contract) option) with
  | None -> (failwith Errors.missing_mint_or_burn_entrypoint : (int * address) contract)
  | Some c -> c

(* Environments *)

let sell_tez_env : Half_dex.environment = {
  transfer_self = fun (_) (_) (r) (a) -> Context.transfer_xtz r a;
  transfer_proceeds = fun (c) (r) (a) -> Context.transfer_ctez c (Tezos.get_self_address ()) r a;
  get_target_self_reserves = fun (c) -> Float64.mul c._Q c.target;
  multiply_by_target = fun (c) (amt) -> Float64.mul amt c.target;
}

let sell_ctez_env : Half_dex.environment = {
  transfer_self = fun (c) (s) (r) (a) -> Context.transfer_ctez c s r a;
  transfer_proceeds = fun (_) (r) (a) -> Context.transfer_xtz r a;
  get_target_self_reserves = fun (c) -> c._Q;
  multiply_by_target = fun (c) (amt) -> Float64.div amt c.target;
}

(* housekeeping *)

[@inline]
let drift_adjustment (storage : storage) (delta : nat): int = // Float64
  let ctxt = storage.context in
  let tQ = sell_tez_env.get_target_self_reserves ctxt in
  let qc = min storage.sell_ctez.self_reserves ctxt._Q in
  let qt = min storage.sell_tez.self_reserves tQ in
  let tqc_m_qt = (sell_tez_env.multiply_by_target ctxt qc) - qt in
  let d_drift = 65536n * delta * abs(tqc_m_qt * tqc_m_qt * tqc_m_qt) / (tQ * tQ * tQ) in
  if tqc_m_qt < 0 then -d_drift else int d_drift 

let fee_rate (q : nat) (_Q : nat) : Float64.t =
  if 8n * q < _Q  (* if q < 12.5% of _Q *)
    then 5845483520n (* ~1% / year *)
  else if 8n * q > 7n * _Q (* if q > 87.5% of _Q*) 
    then 0n (* 0% / year *)
    else abs(5845483520n  * (7n * _Q - 8n * q)) / (6n * _Q) (* [0%, ~1%] / year *)

let update_fee_index (ctez_fa12_address: address) (delta: nat) (outstanding : nat) (_Q : nat) (dex : Half_dex.t) : Half_dex.t * nat * operation = 
  let rate = fee_rate dex.self_reserves _Q in
  (* rate is given as a multiple of 2^(-64), roughly [0%, 1%] / year *)
  let new_fee_index = dex.fee_index + Float64.mul (delta * dex.fee_index) rate in
  (* Compute how many ctez have implicitly been minted since the last update *)
  (* We round this down while we round the ctez owed up. This leads, over time, to slightly overestimating the outstanding ctez, which is conservative. *)
  let minted = outstanding * (new_fee_index - dex.fee_index) / dex.fee_index in

  (* Create the operation to explicitly mint the ctez in the FA12 contract, and credit it to the CFMM *)
  let ctez_mint_or_burn = get_ctez_mint_or_burn ctez_fa12_address in
  let op_mint_ctez = Tezos.Next.Operation.transaction (minted, Tezos.get_self_address ()) 0mutez ctez_mint_or_burn in

  {dex with fee_index = new_fee_index; subsidy_reserves = clamp_nat (dex.subsidy_reserves + minted) }, clamp_nat (outstanding + minted), op_mint_ctez

let do_housekeeping (storage : storage) : result =
  let now = Tezos.get_now () in
  if storage.last_update <> now then
    let delta = abs (now - storage.last_update) in
    let d_drift = drift_adjustment storage delta in
    (* This is not homegeneous, but setting the constant delta is multiplied with
       to 1.0 magically happens to be reasonable. Why?
       Because (2^16 * 24 * 3600 / 2^64) * 365.25*24*3600 ~ 0.97%.
       This means that the annualized drift changes by roughly one percentage point per day at most.
    *)
    let drift = storage.context.drift in
    let new_drift = drift + d_drift in

    let target = storage.context.target in
    let d_target = Float64.mul ((abs drift) * delta) target in
    (* We assume that `target - d_target < 0` never happens for economic reasons.
       Concretely, even drift were as low as -50% annualized, it would take not
       updating the target for 1.4 years for a negative number to occur *)
    let new_target = if drift < 0  then abs (target - d_target) else target + d_target in
    (* Compute what the liquidity fee should be, based on the ratio of total outstanding ctez to ctez in dexes *)
    let ctez_fa12_address = storage.context.ctez_fa12_address in
    let outstanding = (
      match (Tezos.Next.View.call "viewTotalSupply" () ctez_fa12_address) with
      | None -> (failwith unit : nat)
      | Some n-> n
    ) in
    let _Q = max (outstanding / 20n) 1n in
    let storage = { storage with context = {storage.context with _Q = _Q }} in
    let sell_ctez, outstanding, op_mint_ctez1 = update_fee_index ctez_fa12_address delta outstanding (sell_ctez_env.get_target_self_reserves storage.context) storage.sell_ctez in
    let sell_tez, _outstanding, op_mint_ctez2 = update_fee_index ctez_fa12_address delta outstanding (sell_tez_env.get_target_self_reserves storage.context) storage.sell_tez in
    let storage = { storage with sell_ctez = sell_ctez ; sell_tez = sell_tez } in
    (* TODO: we can combine two mint ops into one *)
    ([op_mint_ctez1 ; op_mint_ctez2], {storage with last_update = now ; context = {storage.context with drift = new_drift ; target = new_target }})
  else
    ([], storage)

(* Entrypoint Functions *)
[@entry]
let set_ctez_fa12_address (ctez_fa12_address : address) (s : storage) : result =
  let () = assert_no_tez_in_transaction () in
  if s.context.ctez_fa12_address <> ("tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU" : address) then
    (failwith Errors.ctez_fa12_address_already_set : result)
  else
    (([] : operation list), { s with context = { s.context with ctez_fa12_address = ctez_fa12_address }})

[@entry]
let create_oven ({ id; delegate; depositors }: create_oven) (s : storage) : result =
  let house_ops, s = do_housekeeping s in
  let handle = { id ; owner = Tezos.get_sender () } in
  if Big_map.mem handle s.ovens then
    (failwith Errors.oven_already_exists : result)
  else
    let (origination_op, oven_address) : operation * address =
    originate_oven delegate (Tezos.get_amount ()) { admin = Tezos.get_self_address () ; handle = handle ; depositors = depositors } in
    let oven = {tez_balance = (Tezos.get_amount ()) ; ctez_outstanding = 0n ; address = oven_address ; fee_index = s.sell_ctez.fee_index * s.sell_tez.fee_index}  in
    let ovens = Big_map.update handle (Some oven) s.ovens in
    (List.append house_ops [origination_op], {s with ovens = ovens})

[@entry]
let withdraw_from_oven (p : withdraw) (s : storage) : result =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let handle = {id = p.id ; owner = Tezos.get_sender ()} in
  let oven : oven = get_oven handle s in
  let oven_contract = get_oven_withdraw oven.address in
  (* Check for undercollateralization *)
  let new_balance = match (oven.tez_balance - p.amount) with
  | None -> (failwith Errors.excessive_tez_withdrawal : tez)
  | Some x -> x in
  let oven = {oven with tez_balance = new_balance} in
  let ovens = Big_map.update handle (Some oven) s.ovens in
  let s = {s with ovens = ovens} in
  if is_under_collateralized oven s.context.target then
    (failwith Errors.excessive_tez_withdrawal : result)
  else
    let withdraw_op = Tezos.Next.Operation.transaction (p.amount, p.to_) 0mutez oven_contract in
    (List.append house_ops [withdraw_op], s)


[@entry]
let register_oven_deposit (p : register_oven_deposit) (s : storage) : result =
    let house_ops, s = do_housekeeping s in
    (* First check that the call is legit *)
    let oven = get_oven p.handle s in
    if oven.address <> Tezos.get_sender () then
      (failwith Errors.only_oven_can_call : result)
    else
      (* register the increased balance *)
      let oven = {oven with tez_balance = oven.tez_balance + p.amount} in
      let ovens = Big_map.update p.handle (Some oven) s.ovens in
      house_ops, {s with ovens = ovens}

(* liquidate the oven by burning "quantity" ctez *)
[@entry]
let liquidate_oven (p : liquidate)  (s: storage) : result  =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let oven : oven = get_oven p.handle s in
  if is_under_collateralized oven s.context.target then
    let remaining_ctez = match is_nat (oven.ctez_outstanding - p.quantity) with
      | None -> (failwith Errors.excessive_ctez_burning : nat)
      | Some n -> n  in
    (* get 32/31 of the target price, meaning there is a 1/31 penalty for the oven owner for being liquidated *)
    let extracted_balance = (Float64.mul (32n * p.quantity) s.context.target) * 1mutez / 31n in
    let new_balance = match oven.tez_balance - extracted_balance with
    | None -> (failwith Errors.impossible : tez)
    | Some x -> x in
    let oven = {oven with ctez_outstanding = remaining_ctez ; tez_balance = new_balance} in
    let ovens = Big_map.update p.handle (Some oven) s.ovens in
    let s = {s with ovens = ovens} in
    let oven_contract = get_oven_withdraw oven.address in
    let op_take_collateral = Tezos.Next.Operation.transaction (extracted_balance, p.to_) 0mutez oven_contract in
    let ctez_mint_or_burn = get_ctez_mint_or_burn s.context.ctez_fa12_address in
    let op_burn_ctez = Tezos.Next.Operation.transaction (-p.quantity, Tezos.get_sender ()) 0mutez ctez_mint_or_burn in
    List.append house_ops [op_burn_ctez ; op_take_collateral], s
  else
    (failwith Errors.not_undercollateralized : result)

[@entry]
let mint_or_burn (p : mint_or_burn)  (s : storage) : result =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let handle = { id = p.id ; owner = Tezos.get_sender () } in
  let oven : oven = get_oven handle s in
  let ctez_outstanding = match is_nat (oven.ctez_outstanding + p.quantity) with
    | None -> (failwith Errors.excessive_ctez_burning : nat)
    | Some n -> n in
  let oven = {oven with ctez_outstanding = ctez_outstanding} in
  let ovens = Big_map.update handle (Some oven) s.ovens in
  let s = {s with ovens = ovens} in
  if is_under_collateralized oven s.context.target then
    (failwith  Errors.excessive_ctez_minting : result)
    (* mint or burn quantity in the fa1.2 of ctez *)
  else
    let ctez_mint_or_burn = get_ctez_mint_or_burn s.context.ctez_fa12_address in
    let mint_or_burn_op = Tezos.Next.Operation.transaction (p.quantity, Tezos.get_sender ()) 0mutez ctez_mint_or_burn in
    List.append house_ops [mint_or_burn_op], s

(* dex *)

[@entry]
let add_tez_liquidity 
    ({ owner; min_liquidity; deadline } : add_tez_liquidity) 
    (s : storage) 
    : result =
  let house_ops, s = do_housekeeping s in
  let p : Half_dex.add_liquidity = { owner = owner; amount_deposited = tez_to_nat (Tezos.get_amount ()); min_liquidity = min_liquidity; deadline = deadline } in
  let sell_tez = Half_dex.add_liquidity s.sell_tez p in
  house_ops, { s with sell_tez = sell_tez }

[@entry]
let add_ctez_liquidity 
    ({ owner; amount_deposited; min_liquidity; deadline } : add_ctez_liquidity) 
    (s : storage) 
    : result =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let p : Half_dex.add_liquidity = { owner = owner; amount_deposited = amount_deposited; min_liquidity = min_liquidity; deadline = deadline } in
  let sell_ctez = Half_dex.add_liquidity s.sell_ctez p in
  let transfer_ctez_op = Context.transfer_ctez s.context (Tezos.get_sender ()) (Tezos.get_self_address ()) amount_deposited in
  List.append house_ops [transfer_ctez_op], { s with sell_ctez = sell_ctez }

[@entry]
let remove_tez_liquidity 
    (p : Half_dex.remove_liquidity) 
    (s : storage) 
    : result =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let (ops, sell_tez) = Half_dex.remove_liquidity s.sell_tez s.context sell_tez_env p in
  List.append house_ops ops, { s with sell_tez = sell_tez }

[@entry]
let remove_ctez_liquidity 
    (p : Half_dex.remove_liquidity) 
    (s : storage) 
    : result =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let (ops, sell_ctez) = Half_dex.remove_liquidity s.sell_ctez s.context sell_ctez_env p in
  List.append house_ops ops, { s with sell_ctez = sell_ctez }

[@entry]
let collect_from_tez_liquidity
    (p : Half_dex.collect_proceeds_and_subsidy) 
    (s : storage) 
    : result =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let (ops, sell_tez) = Half_dex.collect_proceeds_and_subsidy s.sell_tez s.context sell_tez_env p in
  List.append house_ops ops, { s with sell_tez = sell_tez }

[@entry]
let collect_from_ctez_liquidity 
    (p : Half_dex.collect_proceeds_and_subsidy) 
    (s : storage) 
    : result =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let (ops, sell_ctez) = Half_dex.collect_proceeds_and_subsidy s.sell_ctez s.context sell_ctez_env p in
  List.append house_ops ops, { s with sell_ctez = sell_ctez }

[@entry]
let tez_to_ctez
    ({to_; min_ctez_bought; deadline} : tez_to_ctez)
    (s : storage)
    : result =
  let house_ops, s = do_housekeeping s in
  let p : Half_dex.swap = { to_ = to_; deadline = deadline; proceeds_amount = tez_to_nat (Tezos.get_amount ()); min_self = min_ctez_bought } in
  let (ops, sell_ctez) = Half_dex.swap s.sell_ctez s.context sell_ctez_env p in
  List.append house_ops ops, { s with sell_ctez = sell_ctez }

[@entry]
let ctez_to_tez
    ({to_; ctez_sold; min_tez_bought; deadline} : ctez_to_tez)
    (s : storage)
    : result =
  let house_ops, s = do_housekeeping s in
  let () = assert_no_tez_in_transaction () in
  let p : Half_dex.swap = { to_ = to_; deadline = deadline; proceeds_amount = ctez_sold; min_self = min_tez_bought } in
  let (ops, sell_tez) = Half_dex.swap s.sell_tez s.context sell_tez_env p in
  let transfer_ctez_op = Context.transfer_ctez s.context (Tezos.get_sender ()) (Tezos.get_self_address ()) ctez_sold in
  let ops = transfer_ctez_op :: ops in 
  List.append house_ops ops, { s with sell_tez = sell_tez }

(* Views *)

[@view]
let get_target () (storage : storage) : nat = storage.context.target

[@view]
let get_drift () (storage : storage) : int = storage.context.drift
