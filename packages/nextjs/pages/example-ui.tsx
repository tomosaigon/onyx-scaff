
import { ethers } from 'ethers'
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
} from "../node_modules/@jpmorganchase/onyx-ssi-sdk/";
// } from "@jpmorganchase/onyx-ssi-sdk";
// } from "@jpmorganchase/onyx-ssi-sdk/src/index";
import { Resolver } from "did-resolver";
import { getResolver as getEthrResolver } from 'ethr-did-resolver'
import { getResolver as getKeyResolver } from 'key-did-resolver'


import { useEffect } from "react";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
// import { ContractData } from "~~/components/example-ui/ContractData";
// import { ContractInteraction } from "~~/components/example-ui/ContractInteraction";

import {
  LensClient, development, production,
  ProfileSortCriteria,
  ExploreProfilesRequest,
  SingleProfileQueryRequest
} from "@lens-protocol/client";


const lensClient = new LensClient({
  // environment: development
  environment: production
});

// const PROOF_OF_NAME = ['PROOF_OF_NAME'];
const PROOF_OF_NAME = ['proofOfLensHandle'];


async function main() {
  let issuerPrivKey = localStorage.getItem('issuerPrivKey');
  if (issuerPrivKey === null) {
    const account = ethers.Wallet.createRandom();
    issuerPrivKey = account.privateKey
    // const publicKey = KeyUtils.privateKeyToPublicKey(privateKey)
    // const did = `did:ethr:${this.providerConfigs.name}:${account.address}` 
    localStorage.setItem('issuerPrivKey', issuerPrivKey);

    // function addDelegate(address identity, bytes32 delegateType, address delegate, uint validity) public {
    console.log(account.address);
  }



  const didKey = new KeyDIDMethod()

  //DID Ethr configs
  const ethrProvider = {
    name: 'hardhat',
    // rpcUrl: 'https://rpc-mumbai.maticvigil.com/',
    rpcUrl: 'http://localhost:8545',
    // registry: "0x41D788c9c5D335362D713152F407692c5EEAfAae"
    registry: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  }

  //create DID for Issuer (did:ethr)
  const didEthr = new EthrDIDMethod(ethrProvider)
  // const issuerEthrDid = await didEthr.create();
  const issuerEthrDid = await didEthr.generateFromPrivateKey(issuerPrivKey);



  let holderPrivKey = localStorage.getItem('holderPrivKey');
  if (holderPrivKey === null) {
    const account = ethers.Wallet.createRandom();
    holderPrivKey = account.privateKey
    localStorage.setItem('holderPrivKey', holderPrivKey);
    console.log(account.address);
  }
  //create DID for Holder of Credential (did:key)
  // const holderDID = await didKey.create();
  const holderDID = await didEthr.generateFromPrivateKey(holderPrivKey);

  //create DID for VC to support Revocation of Credential
  const vcDID = await didEthr.create();

  //Create a 'Proof of Name' VC
  const subjectData = {
    "handle": "tomot.lens"
  }

  //Additonal parameters can be added to VC including:
  //vc id, expirationDate, credentialStatus, credentialSchema, etc
  const additionalParams = {
    id: vcDID.did,
    expirationDate: "2024-01-01T19:23:24Z",
  }

  const vc = createCredential(
    issuerEthrDid.did, holderDID.did, subjectData, PROOF_OF_NAME, additionalParams)
  console.log(JSON.stringify(vc, null, 2))

  const jwtService = new JWTService()
  const jwtVC = await jwtService.signVC(issuerEthrDid, vc)
  console.log(jwtVC)



  console.log('-----------------VC Presentation---------------')

  //Create Presentation from VC JWT
  const vp = await createPresentation(holderDID.did, [jwtVC])
  console.log(JSON.stringify(vp, null, 2))

  const jwtVP = await jwtService.signVP(holderDID, vp)
  console.log(jwtVP)

  console.log('----------------------VERIFY VC/VP------------------')

  //create DID resolvers
  const ethrResolver = getEthrResolver(ethrProvider)
  const keyResolver = getKeyResolver()
  const didResolver = new Resolver({
    ...ethrResolver,
    ...keyResolver
  })


  //Verify VC JWT from Issuer
  const resultVc = await verifyCredentialJWT(jwtVC, didResolver)
  console.log(resultVc)

  //Verify VP JWT from Holder
  const resultVp = await verifyPresentationJWT(jwtVP, didResolver)
  console.log(resultVp)














  const p = await lensClient.profile.fetch({ handle: "tomot.lens" })
  if (p) {
    console.log(p.ownedBy);
  }

  // const p = await lensClient.explore.profiles({
  //   sortCriteria: ProfileSortCriteria.MostFollowers
  // })
  // debugger;
}

const ExampleUI: NextPage = () => {
  useEffect(() => {
    main();
  }, []);
  return (
    <>
      <MetaHeader
        title="Example UI | Scaffold-ETH 2"
        description="Example UI created with 🏗 Scaffold-ETH 2, showcasing some of its features."
      >
        {/* We are importing the font this way to lighten the size of SE2. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree&display=swap" rel="stylesheet" />
      </MetaHeader>
      <div className="grid lg:grid-cols-2 flex-grow" data-theme="exampleUi">
        {/* <ContractInteraction /> */}
        {/* <ContractData /> */}
      </div>
    </>
  );
};

export default ExampleUI;
