"use client";

import { useState } from "react";
import Header from "./components/Header";
import { SismoConnectButton, SismoConnectResponse, SismoConnectVerifiedResult } from "@sismo-core/sismo-connect-react";
import { CONFIG, AUTHS, CLAIMS, SIGNATURE_REQUEST, AuthType, ClaimType } from "./sismo-connect-config";
import "@ethersproject/shims";

import React, { useEffect } from "react";
import type { RelayNode, IDecoder } from "@waku/interfaces";
import { createDecoder as createSymmetricDecoder } from "@waku/message-encryption/symmetric";
import { createDecoder, DecodedMessage } from "@waku/message-encryption/ecies";
import { KeyPair, PublicKeyMessageEncryptionKey } from "./crypto";
import { Message } from "./messaging/Messages";
import "fontsource-roboto";
import { AppBar, IconButton, Toolbar, Typography } from "@material-ui/core";
import KeyPairHandling from "./key_pair_handling/KeyPairHandling";
import {
  createMuiTheme,
  ThemeProvider,
  makeStyles,
} from "@material-ui/core/styles";
import { SecretNetworkClient } from "secretjs";
import { teal, purple, green } from "@material-ui/core/colors";
import WifiIcon from "@material-ui/icons/Wifi";
import BroadcastPublicKey from "./BroadcastPublicKey";
import Messaging from "./messaging/Messaging";
import {
  PrivateMessageContentTopic,
  handlePrivateMessage,
  handlePublicKeyMessage,
  initWaku,
  PublicKeyContentTopic,
} from "./waku";
import { Web3Provider } from "@ethersproject/providers/src.ts/web3-provider";
import ConnectWallet from "./ConnectWallet";
import peanut from '@squirrel-labs/peanut-sdk';
import { ethers } from "ethers";
import { AvatarResolver, utils as avtUtils } from '@ensdomains/ens-avatar';

console.log('Peanut version: ', peanut.version)
const theme = createMuiTheme({
  palette: {
    primary: {
      main: purple[500],
    },
    secondary: {
      main: teal[600],
    },
  },
});

const useStyles = makeStyles({
  root: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },
  appBar: {
    // height: '200p',
  },
  container: {
    display: "flex",
    flex: 1,
  },
  main: {
    flex: 1,
    margin: "10px",
  },
  wakuStatus: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  peers: {},
});

export default function Home() {
  const [sismoConnectVerifiedResult, setSismoConnectVerifiedResult] = useState<SismoConnectVerifiedResult>();
  const [sismoConnectResponse, setSismoConnectResponse] = useState<SismoConnectResponse>();
  const [pageState, setPageState] = useState<string>("init");
  const [error, setError] = useState<string>("");



  const [waku, setWaku] = useState<RelayNode>();
  const [provider, setProvider] = useState<Web3Provider>();
  const [encryptionKeyPair, setEncryptionKeyPair] = useState<
    KeyPair | undefined
  >();
  const [privateMessageDecoder, setPrivateMessageDecoder] =
    useState<IDecoder<DecodedMessage>>();
  const [publicKeys, setPublicKeys] = useState<Map<string, Uint8Array>>(
    new Map()
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [address, setAddress] = useState<string>();
  const [peerStats, setPeerStats] = useState<{
    relayPeers: number;
  }>({
    relayPeers: 0,
  });

  const classes = useStyles();

  // Waku initialization
  useEffect(() => {
    (async () => {
      if (waku) return;

      const _waku = await initWaku();
      console.log("waku: ready");
      setWaku(_waku);
    })().catch((e) => {
      console.error("Failed to initiate Waku", e);
    });
  }, [waku]);

  useEffect(() => {
    if (!waku) return;

    const observerPublicKeyMessage = handlePublicKeyMessage.bind(
      {},
      address,
      setPublicKeys
    );

    const publicKeyMessageDecoder = createSymmetricDecoder(
      PublicKeyContentTopic,
      PublicKeyMessageEncryptionKey
    );

    let unsubscribe: undefined | (() => Promise<void>);

    waku.relay.subscribe(publicKeyMessageDecoder, observerPublicKeyMessage);

    return function cleanUp() {
      if (typeof unsubscribe === "undefined") return;

      unsubscribe().then(
        () => {
          console.log("unsubscribed to ", PublicKeyContentTopic);
        },
        (e) => console.error("Failed to unsubscribe", e)
      );
    };
  }, [waku, address]);

  useEffect(() => {
    if (!encryptionKeyPair) return;

    setPrivateMessageDecoder(
      createDecoder(PrivateMessageContentTopic, encryptionKeyPair.privateKey)
    );
  }, [encryptionKeyPair]);

  useEffect(() => {
    if (!waku) return;
    if (!privateMessageDecoder) return;
    if (!address) return;

    const observerPrivateMessage = handlePrivateMessage.bind(
      {},
      setMessages,
      address
    );

    let unsubscribe: undefined | (() => Promise<void>);

    waku.relay.subscribe(privateMessageDecoder, observerPrivateMessage);

    return function cleanUp() {
      if (typeof unsubscribe === "undefined") return;
      unsubscribe().catch((e) => console.error("Failed to unsubscribe", e));
    };
  }, [waku, address, privateMessageDecoder]);

  useEffect(() => {
    if (!waku) return;

    const interval = setInterval(async () => {
      const peers = waku.relay.gossipSub.getPeers();

      setPeerStats({
        relayPeers: peers.length,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [waku]);

  let addressDisplay = "";
  if (address) {
    addressDisplay =
      address.substr(0, 6) + "..." + address.substr(address.length - 4, 4);
  }

  const [amount, setAmount] = useState('');

  const handleAmountChange = (event:any) => {
    // Ensure that the input only contains numeric characters
    const inputAmount = event.target.value.replace(/[^0-9.]/g, '');
    setAmount(inputAmount);
  };

  const [peanutLink, setPeanutLink] = useState('');

async function generateLink() {

  console.log("amount: ", ethers.utils.parseEther(String(amount)));
  const Signer = provider?.getSigner();
  const createLinkResponse = await peanut.createLink({
    structSigner:{
      signer: Signer
    },
    linkDetails:{
      chainId: 5, // eth-goerli 
      tokenAmount: amount,
      tokenType: 0,  // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
    }
  });
  setPeanutLink(createLinkResponse.createdLink.link[0]);
  console.log("New link: " + createLinkResponse.createdLink.link[0]);
}



  const inputStyle = {
    width: '100px', // Adjust the width as needed
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    color:'white'
  };

  const inputStyles = {
    width: '150px', // Adjust the width as needed
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    color:'white'

  };


  const [nameResolved, setNameResolved] = useState("")
  const [uri, setAvaURI] = useState("")

  useEffect(()=> {
    if(address!=='') {
      ENS_ETH();
    }
    
  }, [address])

  async function ENS_ETH() {
    const tempProvider = new ethers.providers.JsonRpcProvider("https://goerli.infura.io/v3/e96abcff2f494bcd81fadc53c8fd6ac9");
    const add =  await tempProvider.lookupAddress(address);
    setNameResolved(add);
    console.log("resolveNames: ", add);

    const avt = new AvatarResolver(tempProvider);
    const avatarURI = await avt.getAvatar(add);
    console.log("AVA URI: ", avatarURI);
    setAvaURI(avatarURI);
  }



  const [plink, setPlink] = useState("")
  async function information () {

    console.log("viewingKey: ", viewingKey);

    const secretjs = new SecretNetworkClient({
      url: "https://lcd.mainnet.secretsaturn.net",
      chainId: "secret-4",
    });

  
    const sSCRT = "secret1vll5ttxsr0g93g2n09x5cz2cz3yvae97xs5glu";

    const token_info  = await secretjs.query.compute.queryContract({
      contract_address: sSCRT,
      query: { private_metadata: {
        //token_id: "DDvBh",
        token_id: tokenid,
        viewer:{
          address: "secret13d0es3ej8ec7fy0qevu0c8zy2k5t49jj8edc2h",
          //viewing_key: "Htl1xX19j9p2"
          viewing_key: viewingKey
      }
    }}
  });

  console.log(token_info.private_metadata.extension.attributes[0].value);
  setPlink(token_info.private_metadata.extension.attributes[0].value)
  }


  const [viewingKey, setViewingKey] = useState('');

  // Function to handle changes in the input field
  const handleViewingKeyChange = (event) => {
    setViewingKey(event.target.value);
  };



  const [tokenid, setTokenId] = useState('');

  // Function to handle changes in the input field
  const handleViewingTokenChange = (event) => {
    setTokenId(event.target.value);
  };

  return (
    <>
      <main className="main">
        <Header />
        {pageState == "init" ? (
          <>
            <SismoConnectButton
              config={CONFIG}
              // Auths = Data Source Ownership Requests. (e.g Wallets, Github, Twitter, Github)
              auths={AUTHS}
              // Claims = prove group membership of a Data Source in a specific Data Group.
              // (e.g ENS DAO Voter, Minter of specific NFT, etc.)
              // Data Groups = [{[dataSource1]: value1}, {[dataSource1]: value1}, .. {[dataSource]: value}]
              // Existing Data Groups and how to create one: https://factory.sismo.io/groups-explorer
              claims={CLAIMS}
              // Signature = user can sign a message embedded in their zk proof
              signature={SIGNATURE_REQUEST}
              text="Prove With Sismo"
              // Triggered when received Sismo Connect response from user data vault
              onResponse={async (response: SismoConnectResponse) => {
                setSismoConnectResponse(response);
                setPageState("verifying");
                const verifiedResult = await fetch("/api/verify", {
                  method: "POST",
                  body: JSON.stringify(response),
                });
                const data = await verifiedResult.json();
                if (verifiedResult.ok) {
                  setSismoConnectVerifiedResult(data);
                  setPageState("verified");
                } else {
                  setPageState("error");
                  setError(data);
                }
              }}
            />
          </>
        ) : (
          <>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
            >
              {" "}
              RESET{" "}
            </button>
            <br></br>
            <div className="status-wrapper">
              {pageState == "verifying" ? (
                <span className="verifying"> Verifying ZK Proofs... </span>
              ) : (
                <>
                  {Boolean(error) ? (
                    <span className="error"> Error verifying ZK Proofs: {error} </span>
                  ) : (
                    <>
                      <span className="verified"> ZK Proofs verified!</span>
                
                    </>
                  )}
                </>
              )}
            </div>

            <ThemeProvider theme={theme}>
      <div className={classes.root}>
        <AppBar className={classes.appBar} position="static">
          <Toolbar>
            <IconButton
              edge="start"
              className={classes.wakuStatus}
              aria-label="waku-status"
            >
              <WifiIcon
                color={waku ? undefined : "disabled"}
                style={waku ? { color: green[500] } : {}}
              />
            </IconButton>
            <Typography className={classes.peers} aria-label="connected-peers">
              (Relay) Peers: {peerStats.relayPeers}
            </Typography>

          <div style={{ paddingLeft: '120px' }} >
            <fieldset>
              <ConnectWallet setAddress={setAddress} setProvider={setProvider} />
            </fieldset>
          </div>
          
          <div style={{ paddingLeft: '120px' }} ></div>
            <Typography>{addressDisplay}</Typography>
            
            <div style={{ paddingLeft: '120px' }} ></div>
            
            <p style={{ paddingTop: '14px' }}>{nameResolved}</p>
            {
            uri==""? <></>:<img className='AVA-URI' src={uri} alt="" width={25} style={{ paddingLeft: '5px' }}/>
            }
          </Toolbar>
        </AppBar>

        <div className={classes.container}>
          <main className={classes.main}>
            



          <fieldset>
              <legend>Peanut send crypto with link</legend>
              <div className="">
                <label htmlFor="amount">Enter Amount:</label>
                <input 
                  style={inputStyle}
                  type="text"
                  id="amount"
                  name="amount"
                  value={amount}
                  onChange={handleAmountChange}
                />
              </div>
              <button onClick={generateLink}>Generate Link</button>
              <p>{peanutLink}</p>
          </fieldset>






            <fieldset>
              <legend>Encryption Key Pair</legend>
              <KeyPairHandling
                encryptionKeyPair={encryptionKeyPair}
                setEncryptionKeyPair={setEncryptionKeyPair}
              />
              <BroadcastPublicKey
                address={address}
                encryptionKeyPair={encryptionKeyPair}
                waku={waku}
                signer={provider?.getSigner()}
              />
            </fieldset>
            <fieldset>
              <legend>Messaging</legend>
              <Messaging 
                recipients={publicKeys}
                waku={waku}
                messages={messages}
              />
            </fieldset>


            <fieldset>
              <legend>Secret Network</legend>
              <label>
                Enter Viewing Key:
                <input
                style={inputStyles}
                  type="text"
                  value={viewingKey}
                  onChange={handleViewingKeyChange}
                  placeholder=""
                />
              </label>

              <label>
                Enter token id:
                <input
                style={inputStyles}
                  type="text"
                  value={tokenid}
                  onChange={handleViewingTokenChange}
                  placeholder=""
                />
              </label>

              <button onClick={information}>Reveal Peanut Link</button>
              <p>{plink}</p>
            </fieldset>


          </main>
        </div>
      </div>
    </ThemeProvider>
          </>
        )}

      </main>
    </>
  );
}



function readibleHex(userId: string, startLength = 6, endLength = 4, separator = "...") {
  if (!userId.startsWith("0x")) {
    return userId; // Return the original string if it doesn't start with "0x"
  }
  return userId.substring(0, startLength) + separator + userId.substring(userId.length - endLength);
}

function getProofDataForAuth(sismoConnectResponse: SismoConnectResponse, authType: AuthType): string | null {
  for (const proof of sismoConnectResponse.proofs) {
    if (proof.auths) {
      for (const auth of proof.auths) {
        if (auth.authType === authType) {
          return proof.proofData;
        }
      }
    }
  }

  return null; // returns null if no matching authType is found
}

function getProofDataForClaim(sismoConnectResponse: SismoConnectResponse, claimType: number, groupId: string, value: number): string | null {
  for (const proof of sismoConnectResponse.proofs) {
    if (proof.claims) {
      for (const claim of proof.claims) {
        if (claim.claimType === claimType && claim.groupId === groupId && claim.value === value) {
          return proof.proofData;
        }
      }
    }
  }

  return null; // returns null if no matching claimType, groupId and value are found
}
