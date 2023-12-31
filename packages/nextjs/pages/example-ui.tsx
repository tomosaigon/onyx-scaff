
import { ethers, Wallet } from 'ethers'
import { Client, Conversation, DecodedMessage } from "@xmtp/xmtp-js";
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


import { useEffect, useRef, useState, ChangeEvent } from "react";
import Marquee from "react-fast-marquee";
import { useAccount } from "wagmi";
import {
  useAnimationConfig,
  useScaffoldContract,
  useScaffoldContractRead,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
  useScaffoldContractWrite
} from "~~/hooks/scaffold-eth";
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

const PEER_ADDRESS = "0xf25e4D9dA70b8463B52B5878A9464fC31574e06f";
const ImpersonateOwnerAddress: string | false = "0xA1656A78637d6f5E1C17926a8CEA28b66D2f85dA";

const HandleSelect: React.FC<{
  setter: (value: string) => void;
  handles: string[];
}> = ({ setter, handles }) => {
  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue === '') { return; }
    setter(selectedValue);
  };

  return (
    <div>
      <label htmlFor="handleSelect">Select a handle:</label>
      <select id="handleSelect" onChange={handleSelectChange}>
        <option key={'foo'} value={''}>[choose handle]</option>
        {handles.map((handle) => (
          <option key={handle} value={handle}>
            {handle}
          </option>
        ))}
      </select>
    </div>
  );
};

const AddDelegate: React.FC<{
  userAddress: string;
  issuerAddress: string;
}> = ({ userAddress, issuerAddress }) => {
  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "EthereumDIDRegistry",
    functionName: "addDelegate",
    args: [userAddress, ethers.utils.formatBytes32String("lens+onyx") as `0x${string}`, issuerAddress, BigInt(3600 * 24 * 2)],
    // value: parseEther("0.01"),
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
  });
  return (
    <div>
      <p>User Address: {userAddress}</p>
      <p>Issuer Address: {issuerAddress}</p>
      <div className="flex rounded-full border border-primary p-1 flex-shrink-0">
        <div className="flex rounded-full border-2 border-primary p-1">
          <button
            className="btn btn-primary rounded-full capitalize font-normal font-white w-24 flex items-center gap-1 hover:gap-2 transition-all tracking-widest"
            onClick={() => writeAsync()}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                addDelegate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


const ExampleUI: NextPage = () => {
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
    setIssuerAddress(ethers.utils.computeAddress(issuerPrivKey));



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
    await xmtpSetup(holderPrivKey);

    //create DID for Holder of Credential (did:key)
    // const holderDID = await didKey.create();
    const holderDID = await didEthr.generateFromPrivateKey(holderPrivKey);
    setHolderAddress(ethers.utils.computeAddress(holderPrivKey));

    //create DID for VC to support Revocation of Credential
    const vcDID = await didEthr.create();

    //Create a 'Proof of Name' VC
    const subjectData = {
      "handle": selectedHandle, // "tomot.lens"
      "owner": ImpersonateOwnerAddress || address,
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

    const _jwtVP = await jwtService.signVP(holderDID, vp)
    setJwtVP(await jwtService.signVP(holderDID, vp))
    console.log(jwtVP)

    // await xmtpMain(holderPrivKey);

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
    const resultVp = await verifyPresentationJWT(_jwtVP, didResolver)
    console.log(resultVp)

  }

  const xmtpSetup = async (holderPrivKey: string) => {
    const wallet = new Wallet(holderPrivKey);
    const client = await Client.create(wallet, { env: "production" });
    await client.publishUserContact();
    clientRef.current = client;
  };
  const xmtpMain = async () => {
    // debugger;
    if (jwtVP === '') {
      return;
    }
    if (clientRef.current === undefined) {
      debugger;
      return;
    }
    if (await clientRef.current.canMessage(PEER_ADDRESS) && !convRef.current) {
      const conversation = await clientRef.current.conversations.newConversation(PEER_ADDRESS);
      convRef.current = conversation;
      //Loads the messages of the conversation
      const messages = await conversation.messages();
      setMessages(messages);
      // conversation.send("gm");
      conversation.send("auth: " + jwtVP);
      if (!jwtVP) {
        debugger;
      } else {
        setIsAuthed(true);
      }
    } else {
      console.log("cant message because is not on the network.");
      //cant message because is not on the network.
    }
  }



  const clientRef = useRef<Client | undefined>(undefined);
  const convRef = useRef<Conversation | undefined>(undefined);
  const [messages, setMessages] = useState([] as DecodedMessage[]);

  const [isAuthed, setIsAuthed] = useState(false);
  const [issuerAddress, setIssuerAddress] = useState("");
  const [holderAddress, setHolderAddress] = useState("");
  const [lensHandles, setLensHandles] = useState(['...']);
  const [selectedHandle, setSelectedHandle] = useState<string>(
    lensHandles.length > 0 && lensHandles[0] != '...' ? lensHandles[0] : ''
  );
  // jwtVP
  const [jwtVP, setJwtVP] = useState<string>('');
  const { address } = useAccount();
  const { data: isValid } = useScaffoldContractRead({
    contractName: "EthereumDIDRegistry",
    functionName: "validDelegate",
    // lens+onyx 
    args: [address, ethers.utils.formatBytes32String("lens+onyx") as `0x${string}`, issuerAddress],
    // args: [address, "0x6c656e732b6f6e79780000000000000000000000000000000000000000000000", issuerAddress],
  });
  // console.log(ethers.utils.formatBytes32String("lens+onyx") as `0x${string}`);
  useEffect(() => {
    xmtpMain();
  }, [jwtVP]);
  useEffect(() => {
    const queryLens = async () => {
      const p = await lensClient.profile.fetch({ handle: "tomot.lens" })
      if (p) {
        console.log(p.ownedBy);
      }
      // const pp = await lensClient.profile.fetchAll({ ownedBy: ["0xA1656A78637d6f5E1C17926a8CEA28b66D2f85dA"] })
      // ({ handle: "tomot.lens" })
      console.log('Pretending to be lens owner...');
      const lensAddress = "0xA1656A78637d6f5E1C17926a8CEA28b66D2f85dA"; // address
      setLensHandles((await lensClient.profile.fetchAll({ ownedBy: [lensAddress] })).items.map(i => i.handle));

      // const p = await lensClient.explore.profiles({
      //   sortCriteria: ProfileSortCriteria.MostFollowers
      // })
      // debugger;
    };
    queryLens();
  }, [address]);

  // useEffect(() => {
  //   if (lensHandles.length > 0) {
  //     setSelectedHandle(lensHandles[0]);
  //   }
  // }, [lensHandles]);

  useEffect(() => {
    if (selectedHandle && selectedHandle !== '...') {
      main();
    }
  }, [selectedHandle]);

  useEffect(() => {
    if (convRef.current) {
      const streamMessages = async () => {
        const newStream = await convRef.current!.streamMessages();
        for await (const msg of newStream) {
          const exists = messages.find((m) => m.id === msg.id);
          if (!exists) {
            console.log("new message", msg);
            setMessages((prevMessages) => {
              const msgsnew = [...prevMessages, msg];
              return msgsnew;
            });
          }
        }
        console.log("streaming messages done");
      };
      streamMessages();
    }
  }, [messages]);

  const ack = (evt: React.MouseEvent<HTMLAnchorElement>, message: DecodedMessage) => { const to = (message.content as string).split('\n')[0].substring('from: '.length); message.conversation.send('reply: ' + to + '\nack'); evt.preventDefault() }
  const nope = (evt: React.MouseEvent<HTMLAnchorElement>, message: DecodedMessage) => { const to = (message.content as string).split('\n')[0].substring('from: '.length); message.conversation.send('reply: ' + to + '\nnope'); evt.preventDefault() }

  return (
    <>
      <MetaHeader
        title="LensPostbox"
        description="Example UI created with 🏗 Scaffold-ETH 2, showcasing some of its features."
      >
        {/* We are importing the font this way to lighten the size of SE2. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree&display=swap" rel="stylesheet" />
      </MetaHeader>
      <div className="grid lg:grid-cols-2 flex-grow" data-theme="exampleUi">
        <span>Issuer: {issuerAddress}</span>
        <span>Holder: {holderAddress}</span>
        <span>Address: {address}</span>
        <span>isValid: {isValid ? "true" : "false"}</span>
        <span>jwtVP: {jwtVP}</span>
        <HandleSelect setter={setSelectedHandle} handles={lensHandles} />
        <p>Selected handle: {selectedHandle}</p>

        {address ? <AddDelegate userAddress={address} issuerAddress={issuerAddress} /> : ''}
        <div>
          <p>Inbox Messages:</p>
          <ul>
            {messages.filter(
              (v) => v.senderAddress === PEER_ADDRESS
            ).filter(
              (v, i, a) => i > a.length - 10
            ).filter(
              (v, i, a) => a.findIndex((t) => t.id === v.id) === i
            ).map((message: DecodedMessage) => (
              <li key={message.id} className='p-2 m-2 border-solid border-black'>
                <div className='xxxw-16'>
                  {message.sent.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </div>
                <div className='xxxw-32'>
                  <code>
                    {message.content}
                  </code>
                  {(message.content as string).split('\n')[0].startsWith('from: 0x') ?
                    (<>
                      <span>&nbsp;[<a href='#' onClick={(evt) => { nope(evt, message) }} >nope</a>]</span>
                      <span>&nbsp;[<a href='#' onClick={(evt) => { ack(evt, message) }} >ack</a>]</span>
                    </>) : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ opacity: 0.1 }}>
          <p>Outbox Messages:</p>
          <ul>
            {messages.filter(
              (v) => v.senderAddress === holderAddress
            ).filter(
              (v, i, a) => a.findIndex((t) => t.id === v.id) === i
            ).map((message: DecodedMessage) => (
              <li key={message.id}>
                {message.sent.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
                {' '}
                {message.senderAddress}: {message.content}
              </li>
            ))}
          </ul>
        </div>
        {/* <ContractInteraction /> */}
        {/* <ContractData /> */}
      </div>
    </>
  );
};

export default ExampleUI;
