from typing import Callable
from tests.ctez2.base import Ctez2BaseTestCase
from tests.helpers.contracts.ctez2.ctez2 import Ctez2
from tests.helpers.utility import get_consumed_mutez
from parameterized import parameterized
from pytezos.client import PyTezosClient

class Ctez2CollectFromCtezLiquidityTestCase(Ctez2BaseTestCase):
    def test_should_fail_if_tez_in_transaction(self) -> None:
        ctez2, _, sender, receiver, *_ = self.default_setup()

        with self.raises_michelson_error(Ctez2.Errors.TEZ_IN_TRANSACTION_DISALLOWED):
            ctez2.using(sender).collect_from_ctez_liquidity(receiver).with_amount(1).send()
            
    def test_should_collect_from_empty_account_correctly(self) -> None:
        ctez2, ctez_token, receiver, *_ = self.prepare_ctez_dex_liquidity()
        empty_account = self.bootstrap_account()

        prev_receiver_ctez_balance = ctez_token.view_balance(receiver)
        prev_receiver_tez_balance = self.get_balance_mutez(receiver)
        prev_ctez_dex = ctez2.get_sell_ctez_dex()
        ctez2.using(empty_account).collect_from_ctez_liquidity(receiver).send()
        self.bake_block()

        current_ctez_dex = ctez2.get_sell_ctez_dex()
        current_owner_account = ctez2.get_ctez_liquidity_owner(empty_account)

        assert ctez_token.view_balance(receiver) == prev_receiver_ctez_balance
        assert self.get_balance_mutez(receiver) == prev_receiver_tez_balance
        assert current_owner_account.liquidity_shares == 0 
        assert current_owner_account.proceeds_owed == 0
        assert current_owner_account.subsidy_owed == 0

        assert current_ctez_dex.total_liquidity_shares == prev_ctez_dex.total_liquidity_shares
        assert current_ctez_dex.self_reserves == prev_ctez_dex.self_reserves
        assert current_ctez_dex.proceeds_reserves == prev_ctez_dex.proceeds_reserves
        assert current_ctez_dex.subsidy_reserves == prev_ctez_dex.subsidy_reserves

    @parameterized.expand([
        ("owner_without_debts", lambda o0, o1, o2: o0, 5248754, 339),
        ("owner_with_debts", lambda o0, o1, o2: o1, 0, 197),
        ("owner_with_more_debts", lambda o0, o1, o2: o2, 0, 78),
    ])
    def test_should_collect_tokens_correctly(
        self, 
        _name: str, 
        get_owner: Callable[[tuple[PyTezosClient, PyTezosClient, PyTezosClient]], PyTezosClient], 
        expected_proceeds_collected: int,
        expected_subsidy_collected: int, 
    ) -> None:
        ctez2, ctez_token, o0, o1, o2 = self.prepare_ctez_dex_liquidity()
        receiver = self.bootstrap_account()
        liquidity_owner = get_owner(o0, o1, o2)

        prev_receiver_ctez_balance = ctez_token.view_balance(receiver)
        prev_receiver_tez_balance = self.get_balance_mutez(receiver)
        prev_ctez_dex = ctez2.get_sell_ctez_dex()
        prev_owner_account = ctez2.get_ctez_liquidity_owner(liquidity_owner)
        ctez2.using(liquidity_owner).collect_from_ctez_liquidity(receiver).send()
        self.bake_block()

        current_ctez_dex = ctez2.get_sell_ctez_dex()
        current_owner_account = ctez2.get_ctez_liquidity_owner(liquidity_owner)

        assert ctez_token.view_balance(receiver) == prev_receiver_ctez_balance + expected_subsidy_collected
        assert self.get_balance_mutez(receiver) == prev_receiver_tez_balance + expected_proceeds_collected
        assert current_owner_account.liquidity_shares == prev_owner_account.liquidity_shares 
        assert current_owner_account.proceeds_owed == prev_owner_account.proceeds_owed + expected_proceeds_collected == 5248754
        assert current_owner_account.subsidy_owed == prev_owner_account.subsidy_owed + expected_subsidy_collected == 339

        assert current_ctez_dex.total_liquidity_shares == prev_ctez_dex.total_liquidity_shares
        assert current_ctez_dex.self_reserves == prev_ctez_dex.self_reserves
        assert current_ctez_dex.proceeds_reserves == prev_ctez_dex.proceeds_reserves
        assert current_ctez_dex.proceeds_debts == prev_ctez_dex.proceeds_debts + expected_proceeds_collected
        assert current_ctez_dex.subsidy_reserves == prev_ctez_dex.subsidy_reserves
        assert current_ctez_dex.subsidy_debts == prev_ctez_dex.subsidy_debts + expected_subsidy_collected

        # the next collect should not change anything
        prev_receiver_ctez_balance = ctez_token.view_balance(receiver)
        prev_receiver_tez_balance = self.get_balance_mutez(receiver)
        prev_ctez_dex = ctez2.get_sell_ctez_dex()
        prev_owner_account = ctez2.get_ctez_liquidity_owner(liquidity_owner)
        ctez2.using(liquidity_owner).collect_from_ctez_liquidity(receiver).send()
        self.bake_block()

        current_ctez_dex = ctez2.get_sell_ctez_dex()
        current_owner_account = ctez2.get_ctez_liquidity_owner(liquidity_owner)

        assert ctez_token.view_balance(receiver) == prev_receiver_ctez_balance
        assert self.get_balance_mutez(receiver) == prev_receiver_tez_balance
        assert current_owner_account.liquidity_shares == prev_owner_account.liquidity_shares 
        assert current_owner_account.proceeds_owed == prev_owner_account.proceeds_owed
        assert current_owner_account.subsidy_owed == prev_owner_account.subsidy_owed

        assert current_ctez_dex.total_liquidity_shares == prev_ctez_dex.total_liquidity_shares
        assert current_ctez_dex.self_reserves == prev_ctez_dex.self_reserves
        assert current_ctez_dex.proceeds_reserves == prev_ctez_dex.proceeds_reserves
        assert current_ctez_dex.proceeds_debts == prev_ctez_dex.proceeds_debts
        assert current_ctez_dex.subsidy_reserves == prev_ctez_dex.subsidy_reserves
        assert current_ctez_dex.subsidy_debts == prev_ctez_dex.subsidy_debts

    def test_collecting_is_the_same_as_remove_and_add(self) -> None:
        ctez2, ctez_token, liquidity_owner, *_ = self.prepare_ctez_dex_liquidity()

        prev_receiver_ctez_balance = ctez_token.view_balance(liquidity_owner)
        prev_receiver_tez_balance = self.get_balance_mutez(liquidity_owner)
        prev_ctez_dex = ctez2.get_sell_ctez_dex()
        prev_owner_account = ctez2.get_ctez_liquidity_owner(liquidity_owner)

        deposit_amount = 10_000_000
        opg = liquidity_owner.bulk(
            ctez2.remove_ctez_liquidity(liquidity_owner, prev_owner_account.liquidity_shares, 0, 0, 0, self.get_future_timestamp()),
            ctez_token.approve(ctez2, deposit_amount),
            ctez2.add_ctez_liquidity(liquidity_owner, deposit_amount, 0, self.get_future_timestamp())
        ).send()
        self.bake_block()

        current_ctez_dex = ctez2.get_sell_ctez_dex()
        current_owner_account = ctez2.get_ctez_liquidity_owner(liquidity_owner)

        assert ctez_token.view_balance(liquidity_owner) == prev_receiver_ctez_balance + 339
        assert self.get_balance_mutez(liquidity_owner) == prev_receiver_tez_balance + 5248754 - get_consumed_mutez(liquidity_owner, opg)
        assert current_owner_account.liquidity_shares == prev_owner_account.liquidity_shares 
        assert current_owner_account.proceeds_owed == 5248754
        assert current_owner_account.subsidy_owed == 340

        assert current_ctez_dex.total_liquidity_shares == prev_ctez_dex.total_liquidity_shares
        assert current_ctez_dex.self_reserves == prev_ctez_dex.self_reserves
        assert current_ctez_dex.proceeds_reserves == prev_ctez_dex.proceeds_reserves
        assert current_ctez_dex.subsidy_reserves == prev_ctez_dex.subsidy_reserves - 339 + 340 
