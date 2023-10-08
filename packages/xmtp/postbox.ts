import { botConfig, XmtpBot, IContext } from "xmtp-bot-cli";
import { Client, DecodedMessage } from "@xmtp/xmtp-js";
import {
    EthrDIDMethod,
    KeyDIDMethod,
    JWTService,
    createCredential,
    createPresentation,
    createAndSignPresentationJWT,
    getSubjectFromVP,
    verifyCredentialJWT,
    verifyPresentationJWT
    // } from "./node_modules/@jpmorganchase/onyx-ssi-sdk/";
} from "@jpmorganchase/onyx-ssi-sdk";
import { Resolver } from "did-resolver";
import { getResolver as getEthrResolver } from 'ethr-did-resolver'
import { getResolver as getKeyResolver } from 'key-did-resolver'

import {
    LensClient, development, production,
    ProfileSortCriteria,
    ExploreProfilesRequest,
    SingleProfileQueryRequest
} from "@lens-protocol/client";
import { ethers } from "ethers";

if (process.env.PBX_XMTP_KEY === undefined) {
    throw "PBX_XMTP_KEY is not set";
}
botConfig.key = process.env.PBX_XMTP_KEY;
// botConfig.env = "dev";  


const ethrProvider = {
    name: 'hardhat',
    // rpcUrl: 'https://rpc-mumbai.maticvigil.com/',
    rpcUrl: 'http://localhost:8545',
    // registry: "0x41D788c9c5D335362D713152F407692c5EEAfAae"
    registry: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}
const provider = new ethers.JsonRpcProvider(ethrProvider.rpcUrl);
const contract = new ethers.Contract(ethrProvider.registry, ['function validDelegate(address, bytes32, address) public view returns(bool)'], provider);
console.log(JSON.stringify(contract));

const lensClient = new LensClient({
    // environment: development
    environment: production
});

async function validDelegate(identityAddress: string, delegateType: string, delegateAddress: string) {
    console.log(`validDelegate(${identityAddress}, ${delegateType}, ${delegateAddress})`);
    console.log(`contract.target = ${contract.target}`);
    const result = await contract.validDelegate(identityAddress, delegateType, delegateAddress);
    return result;
}

const vpJWT = process.env.VP_JWT || process.exit(1);
const jwtService = new JWTService()
const vp = jwtService.decodeJWT(vpJWT);
// did:ethr:hardhat:0x87B9cfbb278359De0A44197A085B6f7a24965881
console.log(vp.payload.iss);
// console.log(JSON.stringify(vp.payload));
const vcJWT = vp.payload.vp.verifiableCredential[0];
// payload: {
//         exp: 1704137004,
//         vc: { '@context': [Array], type: [Array], credentialSubject: [Object] },
//         sub: 'did:ethr:hardhat:0x87B9cfbb278359De0A44197A085B6f7a24965881',
//         jti: 'did:ethr:hardhat:0x1a80d32f20cc9a3017C4D8cAD8E47f5E66Cb47ca',
//         nbf: 1696750044,
//         iss: 'did:ethr:hardhat:0xBA421D17C45B78570E9C6FBde2a021cE5A1d4484'
// },
const vc = jwtService.decodeJWT(vcJWT);
console.log(JSON.stringify(vc.payload));
const { handle } = vc.payload.vc.credentialSubject;
console.log(handle);
console.log(vc.payload.vc.credentialSubject);
const issuer = (() => { const match = vc.payload.iss.match(/did:ethr:hardhat:(0x[0-9a-fA-F]{40})/); return match ? match[1] : undefined; })();
let owner;
// await lensClient.profile.fetchAll({ ownedBy: [lensAddress] })).items.map(i => i.handle))
lensClient.profile.fetch({ handle: handle }).then((profile) => {
    owner = profile!.ownedBy;
    if (owner === '0xA1656A78637d6f5E1C17926a8CEA28b66D2f85dA') {
        console.log('Pretend to be 0xA1656A78637d6f5E1C17926a8CEA28b66D2f85dA');
        owner = '0x95654e2B8A7B57E9DcF744f9Ccc6b79De2087e55';
    }
    console.log(owner);
    //ethers.utils.formatBytes32String("lens+onyx") as `0x${string}`
    // check that the VC issuer is a valid Delegate for the owner of the lens handle
    validDelegate(owner, '0x6c656e732b6f6e79780000000000000000000000000000000000000000000000', issuer).then((result) => {
        console.log(result);
        process.exit(0);
    });
}).catch((err) => {
    console.log(err);
});
//  fetchAll({ ownedBy: [lensAddress] })).items.map(i => i.handle))

console.log('Starting bot. Enter your custom greeting, e.g. gm (or "exit" to exit, "info" to see current greeting):');
const bot = new XmtpBot(
    async (ctx: IContext, line: string) => {
        if (line === 'exit') {
            return false;
        }
        if (line === 'info') {
            console.log(`greeting = ${ctx.greeting}`);
            return true;
        }
        console.log(`set greeting = ${line}`);
        ctx.greeting = line;
        return true;
    },
    async (ctx: IContext, message: DecodedMessage) => {
        if (ctx.client !== undefined && message.senderAddress === (ctx.client as Client).address) {
            return true;
        }
        console.log(`Got a message`, message.content);
        if ((message.content as string).startsWith('checkvp ')) {
            //create DID resolvers
            const ethrResolver = getEthrResolver(ethrProvider)
            const keyResolver = getKeyResolver()
            const didResolver = new Resolver({
                ...ethrResolver,
                ...keyResolver
            })


            // //Verify VC JWT from Issuer
            // const resultVc = await verifyCredentialJWT(jwtVC, didResolver)
            // console.log(resultVc)

            // //Verify VP JWT from Holder
            // const resultVp = await verifyPresentationJWT(_jwtVP, didResolver)
            // console.log(resultVp)
        }
        message.conversation.send(ctx.greeting ? ctx.greeting : 'gm');
        return true;
    },
);

bot.run().then(() => {
    console.log('bot.run() done');
    process.exit(0);
}).catch((err) => {
    console.error(`bot.run() error: ${err}`);
});
