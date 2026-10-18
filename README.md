# base-onchain-lab

Small, tested building blocks for [Base](https://base.org): Solidity contracts (Foundry) and a TypeScript toolkit ([viem](https://viem.sh)) for reading chain data.

## Contracts (`src/`)

| Contract | What it does |
| --- | --- |
| `LinearVesting` | Holds an ERC-20 for one beneficiary and releases it linearly over a duration, with an optional cliff. Funding is a plain token transfer; top-ups vest over the same schedule. Anyone can trigger `release()`. |
| `TokenFaucet` | Drips a fixed amount of an ERC-20 per address, at most once per cooldown. Owner can change the config and sweep the balance. Meant for testnet tokens. |

Tests live in `test/` (unit tests plus a fuzz test for the vesting curve). Requires [Foundry](https://book.getfoundry.sh/getting-started/installation):

```sh
forge install foundry-rs/forge-std --no-git
forge build
forge test -vvv
```

### Deploying to Base Sepolia

```sh
# Faucet
TOKEN_ADDRESS=0x... DRIP_AMOUNT=10000000000000000000 COOLDOWN_SECONDS=86400 \
  forge script script/DeployFaucet.s.sol --rpc-url base_sepolia --broadcast --private-key $PRIVATE_KEY

# Vesting (then transfer the tokens to be vested to the printed address)
TOKEN_ADDRESS=0x... BENEFICIARY=0x... START=1790000000 CLIFF_SECONDS=2592000 DURATION_SECONDS=31536000 \
  forge script script/DeployVesting.s.sol --rpc-url base_sepolia --broadcast --private-key $PRIVATE_KEY
```

Use a throwaway key with testnet funds only.

## TypeScript toolkit (`ts/`)

Requires Node 20+.

```sh
cd ts
npm install
npm test
npm run build
```

Library exports: network helpers, ERC-20/vesting/faucet ABIs, `getTokenInfo`, `getBalance`, a chunked `getTransferLogs`, formatting helpers, and `vestedAmount`/`releasableAmount`, which mirror the contract's integer math so schedules can be previewed off-chain.

### CLI

```sh
node dist/cli.js info <token>                      # name, symbol, decimals, supply
node dist/cli.js balance <token> <holder>
node dist/cli.js transfers <token> --from-block 1000000 --sender 0x...
node dist/cli.js vesting 1000 --start 1790000000 --cliff 30d --duration 365d --at 1800000000
```

Default network is Base Sepolia; pass `--network base` and/or `--rpc <url>` to change it. The `vesting` command works fully offline.

## License

MIT
