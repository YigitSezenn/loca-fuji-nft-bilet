import { defineChain } from "viem";

export const fuji = defineChain({
  id: 43113,
  name: "Avalanche Fuji C-Chain",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.avax-test.network/ext/bc/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Snowtrace", url: "https://testnet.snowtrace.io" },
  },
});

export const FUJI_HEX = "0xa869";

export const FUJI_READ_RPCS = [
  "https://avalanche-fuji-c-chain-rpc.publicnode.com",
  "https://api.avax-test.network/ext/bc/C/rpc",
  "https://avalanche-fuji.drpc.org",
];

export type FoundWallet = {
  id: string;
  name: string;
  provider: EthereumProvider;
};

type Eip6963Detail = {
  info: { uuid: string; name: string };
  provider: EthereumProvider;
};

function walletName(provider: EthereumProvider, fallback: string) {
  if (provider.isOkxWallet) return "OKX Wallet";
  if (provider.isAvalanche) return "Core";
  if (provider.isMetaMask) return "MetaMask";
  return fallback;
}

export function discoverWallets(): FoundWallet[] {
  if (typeof window === "undefined") return [];
  const list: FoundWallet[] = [];
  const seen = new Set<EthereumProvider>();

  const push = (id: string, name: string, provider?: EthereumProvider) => {
    if (!provider || seen.has(provider) || typeof provider.request !== "function") return;
    seen.add(provider);
    list.push({ id, name, provider });
  };

  const ethereum = window.ethereum;
  if (ethereum?.providers?.length) {
    ethereum.providers.forEach((provider, index) => {
      push(`injected-${index}`, walletName(provider, "Cüzdan"), provider);
    });
  } else {
    push("ethereum", ethereum ? walletName(ethereum, "Tarayıcı cüzdanı") : "Tarayıcı cüzdanı", ethereum);
  }

  push("okx", "OKX Wallet", window.okxwallet);
  push("core", "Core", window.avalanche);
  return list;
}

export function watchWallets(onChange: (wallets: FoundWallet[]) => void) {
  const map = new Map<string, FoundWallet>();
  const publish = () => onChange([...map.values()]);

  const absorb = (wallets: FoundWallet[]) => {
    for (const wallet of wallets) {
      const known = [...map.values()].some(
        (item) => item.provider === wallet.provider || item.name === wallet.name,
      );
      if (known) continue;
      map.set(wallet.id, wallet);
    }
    publish();
  };

  absorb(discoverWallets());

  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963Detail>).detail;
    if (!detail?.provider || typeof detail.provider.request !== "function") return;
    const name = walletName(detail.provider, detail.info.name);
    const known = [...map.values()].some((item) => item.provider === detail.provider || item.name === name);
    if (known) return;
    map.set(detail.info.uuid, {
      id: detail.info.uuid,
      name,
      provider: detail.provider,
    });
    publish();
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  const timers = [400, 1500].map((ms) => window.setTimeout(() => absorb(discoverWallets()), ms));
  const onFocus = () => {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    absorb(discoverWallets());
  };
  window.addEventListener("focus", onFocus);

  return () => {
    window.removeEventListener("eip6963:announceProvider", onAnnounce);
    window.removeEventListener("focus", onFocus);
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}

export function preferredWallet(wallets: FoundWallet[]) {
  return wallets.find((wallet) => wallet.name === "MetaMask") ?? wallets[0] ?? null;
}

export function metamaskDappUrl() {
  const { host, pathname, search } = window.location;
  return `https://metamask.app.link/dapp/${host}${pathname}${search}`;
}
