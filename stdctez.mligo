// Various helpful stdlib extensions for ctez 
#import "errors.mligo" "Errors"

type 'a with_operations = operation list * 'a

[@inline]
let clamp_nat (x : int) : nat = 
  match is_nat x with
  | None -> 0n
  | Some x -> x

[@inline]
let min (x : nat) (y : nat) : nat = if x < y then x else y

[@inline]
let ceil_div (numerator : nat) (denominator : nat) : nat = abs ((- numerator) / (int denominator))

module Float48 = struct
  type t = nat

  // TODO
end

module List = struct
  include List

  [@inline]
  let append t1 t2 = fold_right (fun (x, tl) -> x :: tl) t1 t2
end

[@inline]
let assert_no_tez_in_transaction
    (_ : unit)
    : unit =
  Assert.Error.assert (Tezos.get_amount () = 0mutez) Errors.tez_in_transaction_disallowed 

[@inline]
let tez_to_nat (a: tez) : nat = a / 1mutez
