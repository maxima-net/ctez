import { OpKind, WalletContract, WalletParamsWithKind } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import {
  AddLiquidityParams,
  CashToTokenParams,
  ErrorType,
  RemoveLiquidityParams,
  TokenToCashParams,
  TokenToTokenParams,
} from '../interfaces';
import { CFMM_ADDRESS } from '../utils/globals';
import { getTezosInstance } from './client';
import { getCTezFa12Contract, getLQTContract } from './fa12';
import { executeMethod, initContract } from './utils';

let cfmm: WalletContract;

export const initCfmm = async (address: string): Promise<void> => {
  cfmm = await initContract(address);
};

export const getTokenAllowanceOps = async (
  tokenContract: WalletContract,
  userAddress: string,
  newAllowance: number,
): Promise<WalletParamsWithKind[]> => {
  const batchOps: WalletParamsWithKind[] = [];
  const maxTokensDeposited = new BigNumber(newAllowance).shiftedBy(6);
  const storage: any = await tokenContract.storage();
  const currentAllowance = new BigNumber(
    (await storage.allowances.get({ owner: userAddress, spender: CFMM_ADDRESS })) ?? 0,
  )
    .shiftedBy(-6)
    .toNumber();
  if (currentAllowance < newAllowance) {
    if (currentAllowance > 0) {
      batchOps.push({
        kind: OpKind.TRANSACTION,
        ...tokenContract.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
      });
    }
    batchOps.push({
      kind: OpKind.TRANSACTION,
      ...tokenContract.methods.approve(CFMM_ADDRESS, maxTokensDeposited).toTransferParams(),
    });
  }
  return batchOps;
};

export const addLiquidity = async (
  args: AddLiquidityParams,
  userAddress: string,
): Promise<string> => {
  const tezos = getTezosInstance();
  const CTezFa12 = await getCTezFa12Contract();
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    CTezFa12,
    userAddress,
    args.maxTokensDeposited,
  );
  const batch = tezos.wallet.batch([
    ...batchOps,
    {
      kind: OpKind.TRANSACTION,
      ...cfmm.methods
        .addLiquidity(
          args.owner,
          args.minLqtMinted,
          new BigNumber(args.maxTokensDeposited).shiftedBy(6),
          args.deadline.toISOString(),
        )
        .toTransferParams(),
      amount: args.amount,
    },
    {
      kind: OpKind.TRANSACTION,
      ...CTezFa12.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
    },
  ]);
  const hash = await batch.send();
  return hash.opHash;
};

export const removeLiquidity = async (
  args: RemoveLiquidityParams,
  userAddress: string,
): Promise<string> => {
  const tezos = getTezosInstance();
  const LQTFa12 = await getLQTContract();
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    LQTFa12,
    userAddress,
    args.lqtBurned,
  );
  const batch = tezos.wallet.batch([
    ...batchOps,
    {
      kind: OpKind.TRANSACTION,
      ...cfmm.methods
        .removeLiquidity(
          args.to,
          args.lqtBurned,
          new BigNumber(args.minCashWithdrawn).shiftedBy(6),
          new BigNumber(args.minTokensWithdrawn).shiftedBy(6),
          args.deadline.toISOString(),
        )
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...LQTFa12.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
    },
  ]);
  const hash = await batch.send();
  return hash.opHash;
};

export const cashToToken = async (args: CashToTokenParams): Promise<string> => {
  const hash = await executeMethod(
    cfmm,
    'cashToToken',
    [args.to, new BigNumber(args.minTokensBought).shiftedBy(6), args.deadline.toISOString()],
    undefined,
    new BigNumber(args.amount).shiftedBy(6).toNumber(),
    true,
  );
  return hash;
};

export const tokenToCash = async (
  args: TokenToCashParams,
  userAddress: string,
): Promise<string> => {
  const tezos = getTezosInstance();
  const CTezFa12 = await getCTezFa12Contract();
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    CTezFa12,
    userAddress,
    args.tokensSold,
  );

  const batch = tezos.wallet.batch([
    ...batchOps,
    {
      kind: OpKind.TRANSACTION,
      ...cfmm.methods
        .tokenToCash(
          args.to,
          new BigNumber(args.tokensSold).shiftedBy(6),
          new BigNumber(args.minCashBought).shiftedBy(6),
          args.deadline.toISOString(),
        )
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...CTezFa12.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
    },
  ]);
  const hash = await batch.send();
  return hash.opHash;
};

export const tokenToToken = async (args: TokenToTokenParams): Promise<string> => {
  const hash = await executeMethod(cfmm, 'tokenToToken', [
    args.outputCfmmContract,
    new BigNumber(args.minTokensBought).shiftedBy(6),
    args.to,
    new BigNumber(args.tokensSold).shiftedBy(6),
    args.deadline.toISOString(),
  ]);
  return hash;
};

export const cfmmError: ErrorType = {
  0: 'TOKEN CONTRACT MUST HAVE A TRANSFER ENTRYPOINT',
  1: 'ASSERTION VIOLATED CASH BOUGHT SHOULD BE LESS THAN CASHPOOL',
  2: 'PENDING POOL UPDATES MUST BE ZERO',
  3: 'THE CURRENT TIME MUST BE LESS THAN THE DEADLINE',
  4: 'MAX TOKENS DEPOSITED MUST BE GREATER THAN OR EQUAL TO TOKENS DEPOSITED',
  5: 'LQT MINTED MUST BE GREATER THAN MIN LQT MINTED',
  7: 'ONLY NEW MANAGER CAN ACCEPT',
  8: 'CASH BOUGHT MUST BE GREATER THAN OR EQUAL TO MIN CASH BOUGHT',
  9: 'INVALID TO ADDRESS',
  10: 'AMOUNT MUST BE ZERO',
  11: 'THE AMOUNT OF CASH WITHDRAWN MUST BE GREATER THAN OR EQUAL TO MIN CASH WITHDRAWN',
  12: 'LQT CONTRACT MUST HAVE A MINT OR BURN ENTRYPOINT',
  13: 'THE AMOUNT OF TOKENS WITHDRAWN MUST BE GREATER THAN OR EQUAL TO MIN TOKENS WITHDRAWN',
  14: 'CANNOT BURN MORE THAN THE TOTAL AMOUNT OF LQT',
  15: 'TOKEN POOL MINUS TOKENS WITHDRAWN IS NEGATIVE',
  16: 'CASH POOL MINUS CASH WITHDRAWN IS NEGATIVE',
  17: 'CASH POOL MINUS CASH BOUGHT IS NEGATIVE',
  18: 'TOKENS BOUGHT MUST BE GREATER THAN OR EQUAL TO MIN TOKENS BOUGHT',
  19: 'TOKEN POOL MINUS TOKENS BOUGHT IS NEGATIVE',
  20: 'ONLY MANAGER CAN SET BAKER',
  21: 'ONLY MANAGER CAN SET MANAGER',
  22: 'BAKER PERMANENTLY FROZEN',
  24: 'LQT ADDRESS ALREADY SET',
  25: 'CALL NOT FROM AN IMPLICIT ACCOUNT',
  28: 'INVALID FA12 TOKEN CONTRACT MISSING GETBALANCE',
  29: 'THIS ENTRYPOINT MAY ONLY BE CALLED BY GETBALANCE OF TOKENADDRESS',
  31: 'INVALID INTERMEDIATE CONTRACT',
  30: 'THIS ENTRYPOINT MAY ONLY BE CALLED BY GETBALANCE OF CASHADDRESS',
  32: 'TEZ DEPOSIT WOULD BE BURNED',
  33: 'INVALID FA12 CASH CONTRACT MISSING GETBALANCE',
  34: 'MISSING APPROVE ENTRYPOINT IN CASH CONTRACT',
  35: 'CANNOT GET CFMM PRICE ENTRYPOINT FROM CONSUMER',
};
