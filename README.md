# LensPostbox
LensPostbox is a web app, dapp, and XMTP service that gives more control over private messaging to Lens users. An owner of a Lens handle can receive messages at a pseudonymous inbox unconnected to their on-chain addresses. An XMTP service can provide token-gating access, spam/scam filtering service, and more. Anyone can run the service at any address.

Technology used:
Onyx SSI sdk for issuing Verifiable Credentials to an Ethereum Registry DID, as well as the Verifiable Presentation for the VC holder.

Wallet to wallet communication is done using XMTP and xmtp-bot-cli.

Hardhat is used to run a test deployment of the Ethereum DID Registry contract. Ethers and Wagmi are used to interact with the contract for adding and checking delegates for an identity.

## Requirements

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

1. Clone this repo & install dependencies

```
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Hardhat. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `hardhat.config.ts`.

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. 