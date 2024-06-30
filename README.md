# ctez
Ctez contract and frontend

## IMPORTANT

**The code within is currently unverified, unaudited, and untested.
You are absolutely mad if you try to use it for anything serious.**

## Introduction

The following describes a simplified version of Checker in the special case of tez collateralized by tez. Since 99% of the complexity of Checker comes from handling potentially faulty oracles and liquidation auctions, the resulting system is quite simple. There is no governance involved, the system is completely mechanical and straightforward.

## Target factor

The target factor represents the number of tez that a ctez should be pegged to. It starts out at 1.0, but changes over time. Typically given the current state of baking on the Tezos chain, this target factor might be around 1.05 or 1.06 after a year representing the accrual of more tez through baking. The target evolves over time based on its drift.

## Drift

The drift is a system-wide parameter which varies over time. The relationship between the target and the drift is as follows:

`target[t+dt] = target[t] exp[drift[t] * dt]`

Note that given realistic values of `drift` and `dt`, in general `target[t+dt] = target[t] * (1 + drift[t] * dt)` is an excellent approximation and sufficient for our purposes.

## Ovens

An oven is a smart contract following a certain pattern and controlled by a single user. It lets them place tez in it, pick any delegate they want, and mint ctez.

## Liquidation

If a vault has less tez in collateral than the number of outstanding ctez outstanding times the target factor, times 1.0667 (16/15th, as a safety buffer), then anyone can grab the collateral in that vault (or a fraction thereof) by sending to it the outstanding ctez (or a fraction thereof) which is burned.

## CFMM

A constant product market making contract (similar to uniswap) allows people to exchange tez for ctez. Once per block, it pushes the implicit rate of ctez in tez to the ctez contract. Ideally, this rate is the target factor, but this informs us of any deviation. There is no baker for that contract.

Each time the CFMM pushes its rate to the ctez contract, the drift, and the target factor for ctez, are adjusted.

If the price of ctez implied by the CFMM is below the target, the drift is *raised* by  `max(1024 * (target / price - 1)^2, 1) * 2^(-48)` times the number of seconds since the last adjustment. If it is below, it is *lowered* by that amount. This corresponds roughly to a maximum adjustment of the annualized drift of one percentage point for every fractional day since the last adjustment. The adjustment saturates when the discrepancy exceeds one 32ndth. Note that, by a small miracle, `ln(1.01) / year / day ~ 1.027 * 2^(-48) / second^2` which we use to simplify the computation in the implementation.

### Curve

If `x` is the quantity of tez, and `y` the quantity of ctez, and `t` the target (in tez per ctez), then CFMM uses the constant formula `(x + y)^8 - (x - y)^8 = k`. The price is equal to the target when `y = x / t` and, on that point, all derivatives from the 2nd to the 7th vanish, meaning there is more liquidity there.
To give an example, if `t = 1`, `x = 100` and `y = 100`, and a user adds `dx = 63` to the pool, they receive `dy = 62.4`, that is less than `1%` slippage for taking nearly two thirds of the `y` pool!

The target is fed to the CFMM by the ctez contract.

## Rationale

If the price of ctez remains below its target, the drift will keep increasing and at some point, under a quadratically compounding rate vaults are forced into liquidation which may cause ctez to be bid up to claim the tez in the vaults.

If the price of ctez remains above its target, the drift will keep decreasing which might make it attractive to mint and sell ctez while collecting baking rewards.

The drift is a mechanism that automatically discovers a competitive rate at which one might delegate.

## Why it's useful

ctez can be used directly in smart-contracts that would normally pool tez together without the thorny question of "who's baking".Given that there's almost no real movement in this pair, it doesn't need a whole lot of liquidity to function effectively, just a tad enough that the rate read from the contract isn't too noisy, hence the lack of baking shouldn't be a huge hindrance.

## Commands

### Build
```
make compile
```

### Test
The testing stack for the contracts is based on Python and requires [poetry](https://python-poetry.org/), [pytezos](https://pytezos.org/), and [pytest](https://docs.pytest.org/en/7.4.x/) to be installed.

install dependencies
```
poetry install
```

run tests
```
poetry run pytest
```

### Deploy Ctez contracts
Deploys ctez and ctez_fa12 contracts with initial storage states. There are two options

1. RPC url and private key are set in the `.env` file. See `example.env`. If some is missed in the `.env` file the script will ask the value further:
```
poetry run deploy
```
2. RPC url and private key are passed as arguments:
```
poetry run deploy --rpc-url <URL> --private-key <KEY>
```
