from pytezos.client import PyTezosClient
from pytezos.contract.call import ContractCall
from tests.helpers.addressable import Addressable, get_address
from tests.helpers.contracts.contract import ContractHelper
from tests.helpers.utility import (
    DEFAULT_ADDRESS,
    get_build_dir,
    originate_from_file,
)
from pytezos.operation.group import OperationGroup
from os.path import join


class Ctez2(ContractHelper):
    class Errors:
        TEZ_IN_TRANSACTION_DISALLOWED = 'TEZ_IN_TRANSACTION_DISALLOWED'

    @classmethod
    def originate(
        self,
        client: PyTezosClient
    ) -> OperationGroup:
        half_dex_storage = {
            'liquidity_owners' : {},
            'total_liquidity_shares' : 1,
            'self_reserves' : 1,
            'proceeds_reserves' : 0,
            'subsidy_reserves' : 0,
            'fee_index' : 0,
        }

        storage = {
            'ovens': {},
            'last_update': 0,
            'sell_tez' : half_dex_storage,
            'sell_ctez' : half_dex_storage,
            'context': {
                'target' : 1, 
                'drift' : 0, 
                '_Q' : 0,
                'ctez_fa12_address' : DEFAULT_ADDRESS,
            }
        }
        
        filename = join(get_build_dir(), 'ctez_2.tz')

        return originate_from_file(filename, client, storage, balance=1)

    def set_ctez_fa12_address(self, address : Addressable) -> ContractCall:
        return self.contract.set_ctez_fa12_address(get_address(address))

    def get_ctez_fa12_address(self) -> str:
        return self.contract.storage()['context']['ctez_fa12_address']