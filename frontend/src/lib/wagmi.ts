import { createConfig, http } from "wagmi";
import { arc, arcTestnet, mainnet } from "viem/chains";
import { injected, walletConnect } from "wagmi/connectors";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  injected(),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: {
            name: "ARCLOCK FLOW",
            description: "Programmable USDC commitments for outcome-based settlement on Arc.",
            url: "https://arclock.flow",
            icons: [],
          },
        }),
      ]
    : []),
];

// `mainnet` is included so wallet libraries that fall back to it for ENS
// lookups have a CORS-safe transport.
// https://docs.arc.io/arc/references/connect-to-arc
export const wagmiConfig = createConfig({
  chains: [arc, arcTestnet, mainnet],
  connectors,
  transports: {
    [arc.id]: http("https://rpc.mainnet.arc.io"),
    [arcTestnet.id]: http("https://rpc.testnet.arc.io"),
    [mainnet.id]: http("https://cloudflare-eth.com"),
  },
  ssr: true,
});
