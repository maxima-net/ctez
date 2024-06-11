from math import ceil
from tests.ctez2.base import Ctez2BaseTestCase
from tests.helpers.addressable import Addressable
from tests.helpers.contracts.ctez2.ctez2 import Ctez2

class Ctez2AddCtezLiquidityTestCase(Ctez2BaseTestCase):
    def test_should_fail_if_tez_in_transaction(self) -> None:
        ctez2, _, sender, owner, *_ = self.default_setup()

        deposit_amount = 10
        with self.raises_michelson_error(Ctez2.Errors.TEZ_IN_TRANSACTION_DISALLOWED):
            ctez2.using(sender).add_ctez_liquidity(owner, deposit_amount, 10, 0).with_amount(1).send()

    def test_should_fail_if_deadline_has_passed(self) -> None:
        ctez2, _, sender, owner, *_ = self.default_setup()

        deposit_amount = 10
        with self.raises_michelson_error(Ctez2.Errors.DEADLINE_HAS_PASSED):
            ctez2.using(sender).add_ctez_liquidity(owner, deposit_amount, 10, self.get_passed_timestamp()).send()

    def test_should_fail_if_insufficient_liquidity_created(self) -> None:
        ctez2, _, sender, owner, *_ = self.default_setup()

        deposit_amount = 10
        with self.raises_michelson_error(Ctez2.Errors.INSUFFICIENT_LIQUIDITY_CREATED):
            ctez2.using(sender).add_ctez_liquidity(owner, deposit_amount, 100_000, self.get_future_timestamp()).send()

    def test_should_transfer_ctez_token_correctly(self) -> None:
        deposit_amount = 123
        ctez2, ctez_token, sender, owner, *_ = self.default_setup(
            get_ctez_token_balances = lambda sender, *_: {
                sender : deposit_amount
            }
        )

        prev_sender_balance = ctez_token.view_balance(sender)
        prev_ctez2_balance = ctez_token.view_balance(ctez2)

        sender.bulk(
            ctez_token.approve(ctez2, deposit_amount),
            ctez2.add_ctez_liquidity(owner, deposit_amount, deposit_amount, self.get_future_timestamp())
        ).send()
        self.bake_block()

        assert ctez_token.view_balance(sender) == prev_sender_balance - deposit_amount
        assert ctez_token.view_balance(ctez2) == prev_ctez2_balance + deposit_amount

    def test_should_deposit_ctez_correctly_at_the_beginning(self) -> None:
        deposit_amount = 1_000_000
        ctez2, ctez_token, sender, owner, *_ = self.default_setup(
            tez_liquidity = deposit_amount,
            get_ctez_token_balances = lambda sender, *_: {
                sender: deposit_amount
            },
            bootstrap_all_tez_balances = True
        )

        prev_sell_ctez_dex = ctez2.get_sell_ctez_dex()
        prev_sell_tez_dex = ctez2.get_sell_tez_dex()

        sender.bulk(
            ctez_token.approve(ctez2, deposit_amount),
            ctez2.add_ctez_liquidity(owner, deposit_amount, deposit_amount, self.get_future_timestamp())
        ).send()
        self.bake_block()

        current_sell_ctez_dex = ctez2.get_sell_ctez_dex()
        current_sell_tez_dex = ctez2.get_sell_tez_dex()
        current_liquidity_owner = ctez2.get_ctez_liquidity_owner(owner)

        assert current_sell_tez_dex.self_reserves == prev_sell_tez_dex.self_reserves

        assert current_sell_ctez_dex.total_liquidity_shares == prev_sell_ctez_dex.total_liquidity_shares + deposit_amount 
        assert current_sell_ctez_dex.self_reserves == prev_sell_ctez_dex.self_reserves + deposit_amount 
        assert current_sell_ctez_dex.proceeds_reserves == prev_sell_ctez_dex.proceeds_reserves
        assert current_sell_ctez_dex.subsidy_reserves == prev_sell_ctez_dex.subsidy_reserves
        
        assert current_liquidity_owner.liquidity_shares == deposit_amount
        assert current_liquidity_owner.proceeds_owed == 0
        assert current_liquidity_owner.subsidy_owed == 0

    def test_should_deposit_ctez_and_update_accounts_correctly(self) -> None:
        ctez2, ctez_token, depositor_1, depositor_2, depositor_0 = self.default_setup(
            ctez_liquidity = 100_000,
            ctez_total_supply = 100_000_000_000,
            bootstrap_all_tez_balances = True
        )

        def swap_tez_to_ctez(depositor: Addressable, deposit_amount: int):
            proceeds_amount = ceil(deposit_amount*1.06)
            ctez2.using(depositor).tez_to_ctez(depositor, deposit_amount, self.get_future_timestamp()).with_amount(proceeds_amount).send()
            self.bake_block()
            
        def deposit_ctez(depositor: Addressable, deposit_amount: int):
            prev_sell_ctez_dex = ctez2.get_sell_ctez_dex()

            liquidity_shares = ceil(deposit_amount * prev_sell_ctez_dex.total_liquidity_shares / prev_sell_ctez_dex.self_reserves)
            depositor.bulk(
                ctez_token.approve(ctez2, deposit_amount),
                ctez2.add_ctez_liquidity(depositor, deposit_amount, liquidity_shares, self.get_future_timestamp())
            ).send()
            self.bake_block()

        # first deposit (depositor_1 swap tez->ctez and deposit ctez)
        deposit_amount_1 = 10_000
        swap_tez_to_ctez(depositor_1, deposit_amount_1)
        prev_sell_ctez_dex = ctez2.get_sell_ctez_dex()
        prev_sell_tez_dex = ctez2.get_sell_tez_dex()
        deposit_ctez(depositor_1, deposit_amount_1)
        current_sell_ctez_dex = ctez2.get_sell_ctez_dex()
        current_sell_tez_dex = ctez2.get_sell_tez_dex()
        depositor_0_account = ctez2.get_ctez_liquidity_owner(depositor_0)
        depositor_1_account = ctez2.get_ctez_liquidity_owner(depositor_1)

        assert current_sell_tez_dex.self_reserves == prev_sell_tez_dex.self_reserves

        assert current_sell_ctez_dex.total_liquidity_shares == 111_123
        assert current_sell_ctez_dex.self_reserves == prev_sell_ctez_dex.self_reserves + deposit_amount_1 == 99_906
        assert current_sell_ctez_dex.proceeds_reserves == 10_600
        assert current_sell_ctez_dex.subsidy_reserves == 62

        assert depositor_0_account.liquidity_shares == 99_999   # because 1 is initial liquidity share on dex init
        assert depositor_0_account.proceeds_owed == 0           # because there were no proceeds in dex on first deposit
        assert depositor_0_account.subsidy_owed == 0            # because there were no subsidies in dex on first deposit

        assert depositor_1_account.liquidity_shares == 11_123   # which is 11_123/111_123(~10.001%) of total_liquidity_shares. 10.001% of proceeds_reserves(99_906) ~ deposit_mount == 10_000
        assert depositor_1_account.proceeds_owed == 1_062       # which is 11_123/111_123(~10.001%) of proceeds_reserves(10_600)
        assert depositor_1_account.subsidy_owed == 7            # which is 11_123/111_123(~10.001%) of subsidy_reserves(62)

        # second deposit (depositor_2 swap tez->ctez and deposit ctez)
        deposit_amount_2 = 5_000
        swap_tez_to_ctez(depositor_2, deposit_amount_2)
        prev_sell_ctez_dex = ctez2.get_sell_ctez_dex()
        prev_sell_tez_dex = ctez2.get_sell_tez_dex()
        deposit_ctez(depositor_2, deposit_amount_2)
        current_sell_ctez_dex = ctez2.get_sell_ctez_dex()
        current_sell_tez_dex = ctez2.get_sell_tez_dex()
        depositor_0_account = ctez2.get_ctez_liquidity_owner(depositor_0)
        depositor_1_account = ctez2.get_ctez_liquidity_owner(depositor_1)
        depositor_2_account = ctez2.get_ctez_liquidity_owner(depositor_2)

        assert current_sell_ctez_dex.total_liquidity_shares == 116_981
        assert current_sell_ctez_dex.self_reserves == prev_sell_ctez_dex.self_reserves + deposit_amount_2 == 99_860
        assert current_sell_ctez_dex.proceeds_reserves == 15_900
        assert current_sell_ctez_dex.subsidy_reserves == 124

        assert depositor_0_account.liquidity_shares == 99_999   # has 85.48% of liquidity
        assert depositor_0_account.proceeds_owed == 0           # should be unchanged
        assert depositor_0_account.subsidy_owed == 0            # should be unchanged

        assert depositor_1_account.liquidity_shares == 11_123   # has 9.51% of liquidity
        assert depositor_1_account.proceeds_owed == 1_062       # should be unchanged 
        assert depositor_1_account.subsidy_owed == 7            # should be unchanged

        assert depositor_2_account.liquidity_shares == 5_858    # has 5.01% of liquidity
        assert depositor_2_account.proceeds_owed == 797         # which is 5_858/116_981(~5.01%) of proceeds_reserves(15_900)
        assert depositor_2_account.subsidy_owed == 7            # which is 5_858/116_981(~5.01%) of subsidy_reserves(124)

        # third deposit (depositor_1 deposits ctez)
        deposit_amount_3 = 20_000
        ctez_token.using(depositor_0).transfer(depositor_0, depositor_1, deposit_amount_3).send() # depositor_0 is donor in test setup and has ctez
        self.bake_block()
        prev_sell_ctez_dex = ctez2.get_sell_ctez_dex()
        prev_sell_tez_dex = ctez2.get_sell_tez_dex()
        deposit_ctez(depositor_1, deposit_amount_3)
        current_sell_ctez_dex = ctez2.get_sell_ctez_dex()
        current_sell_tez_dex = ctez2.get_sell_tez_dex()
        depositor_0_account = ctez2.get_ctez_liquidity_owner(depositor_0)
        depositor_1_account = ctez2.get_ctez_liquidity_owner(depositor_1)
        depositor_2_account = ctez2.get_ctez_liquidity_owner(depositor_2)

        assert current_sell_ctez_dex.total_liquidity_shares == 140_411
        assert current_sell_ctez_dex.self_reserves == prev_sell_ctez_dex.self_reserves + deposit_amount_3 == 119_860
        assert current_sell_ctez_dex.proceeds_reserves == 15_900
        assert current_sell_ctez_dex.subsidy_reserves == 187

        assert depositor_0_account.liquidity_shares == 99_999   # has 71.22% of liquidity
        assert depositor_0_account.proceeds_owed == 0           # should be unchanged
        assert depositor_0_account.subsidy_owed == 0            # should be unchanged

        # should add new shares and new debts to exist account 
        assert depositor_1_account.liquidity_shares == 34_553   # has 24.61% of liquidity (prev(11_123) + 23_430)
        assert depositor_1_account.proceeds_owed == 3716        # which is prev(1_062) + 23_430/140_411(~24.61%) of proceeds_reserves(15_900)
        assert depositor_1_account.subsidy_owed == 39           # which is prev(7) + 23_430/140_411(~24.61%) of subsidy_reserves(187)

        assert depositor_2_account.liquidity_shares == 5_858    # has 4.17% of liquidity
        assert depositor_2_account.proceeds_owed == 797         # should be unchanged
        assert depositor_2_account.subsidy_owed == 7            # should be unchanged
