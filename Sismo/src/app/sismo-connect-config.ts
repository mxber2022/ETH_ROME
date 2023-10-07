import { ClaimType, AuthType, SignatureRequest, AuthRequest, ClaimRequest, SismoConnectConfig } from "@sismo-core/sismo-connect-client";

export { ClaimType, AuthType };
export const CONFIG: SismoConnectConfig = {
  appId: "0x7745d6823deb72b4fb72903eb6ea6878",
  vault: {
    // For development purposes insert the Data Sources that you want to impersonate
    // Never use this in production
    impersonate: [
      // EVM Data Sources
      "0x7199D548f1B30EA083Fe668202fd5E621241CC89",
      // Github Data Source
      "github:0xHacker",
    ],
  },
  displayRawResponse: false,
};

// ownership prove: of a Data Source (Wallet, Twitter, Github, Telegram, etc.)
export const AUTHS: AuthRequest[] = [
  // Anonymous identifier of the vault for this app
  // vaultId = hash(vaultSecret, appId).
  // full docs: https://docs.sismo.io/sismo-docs/build-with-sismo-connect/technical-documentation/vault-and-proof-identifiers
  { authType: AuthType.VAULT },
  { authType: AuthType.EVM_ACCOUNT },
  { authType: AuthType.GITHUB },
  //{ authType: AuthType.GITHUB, isOptional: true },
  //{ authType: AuthType.TWITTER, isOptional: true },
  //{ authType: AuthType.TELEGRAM, userId: "875608110", isOptional: true },
];

// membership proof: in a Data Group (e.g I own a wallet that is part of a DAO, owns an NFT, etc.)
export const CLAIMS: ClaimRequest[] = [
  {
    // claim on Sismo Hub GitHub Contributors Data Group membership: https://factory.sismo.io/groups-explorer?search=0xda1c3726426d5639f4c6352c2c976b87
    // Data Group members          = contributors to sismo-core/sismo-hub
    // value for each group member = number of contributions
    // request user to prove membership in the group
    groupId: "0xda1c3726426d5639f4c6352c2c976b87", // impersonated github:dhadrien has 1 contribution, eligible
    isOptional: true,
  },
  

  {
    // claim ENS DAO Voters Data Group membership: https://factory.sismo.io/groups-explorer?search=0x85c7ee90829de70d0d51f52336ea4722
    // Data Group members          = voters in ENS DAO
    // value for each group member = number of votes in ENS DAO
    // request user to prove membership in the group with value >= 17
    groupId: "0x85c7ee90829de70d0d51f52336ea4722",
    claimType: ClaimType.GTE,
    value: 4, // impersonated dhadrien.sismo.eth has 17 votes, eligible
    isSelectableByUser: true,
    isOptional: true,
  },

  {
    // claim on Stand with Crypto NFT Minters Data Group membership: https://factory.sismo.io/groups-explorer?search=0xfae674b6cba3ff2f8ce2114defb200b1
    // Data Group members          = minters of the Stand with Crypto NFT
    // value for each group member = number of NFT minted
    // request user to prove membership in the group with value = 10
    groupId: "0xfae674b6cba3ff2f8ce2114defb200b1",
    claimType: ClaimType.EQ,
    value: 10, // dhadrin.sismo.eth minted exactly 10, eligible
    isOptional: true,
  },
];

// Request users to sign a message
export const SIGNATURE_REQUEST: SignatureRequest = {
  message: "Build at ETH Rome !",
  isSelectableByUser: true,
};
