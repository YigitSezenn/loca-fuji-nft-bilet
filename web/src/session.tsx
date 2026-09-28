import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createPublicClient,
  encodeFunctionData,
  fallback,
  formatEther,
  getAddress,
  http,
  isAddress,
  zeroAddress,
  type Address,
  type Hash,
} from "viem";
import { tribunAbi } from "./abi";
import { holdRefund } from "./refundHold";
import { TICKET_PRICE } from "./price";
import { FUJI_HEX, FUJI_READ_RPCS, fuji, watchWallets, type FoundWallet } from "./chain";

export type EventCard = {
  name: string;
  whenLabel: string;
  supply: number;
  issued: number;
};

export type Mine = {
  id: bigint;
  eventId: bigint;
  owner: Address;
  handed: boolean;
};

const SESSION_KEY = "tribun.walletId";
const ACCOUNTS_KEY = "tribun.accounts";

function readSavedAccounts(): Address[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: Address[] = [];
    for (const item of raw) {
      if (typeof item !== "string" || !isAddress(item, { strict: false })) continue;
      const addr = getAddress(item);
      const key = addr.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(addr);
    }
    return out;
  } catch {
    return [];
  }
}

function rememberAccounts(list: readonly string[]): Address[] {
  const out = readSavedAccounts();
  const seen = new Set(out.map((item) => item.toLowerCase()));
  for (const item of list) {
    if (typeof item !== "string" || !isAddress(item, { strict: false })) continue;
    const addr = getAddress(item);
    const key = addr.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(addr);
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(out));
  return out;
}

async function readWalletAccounts(provider: EthereumProvider): Promise<Address[]> {
  const found: string[] = [];
  try {
    const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
    found.push(...accounts);
  } catch {
    /* izinli hesap yok */
  }
  try {
    const perms = (await provider.request({ method: "wallet_getPermissions" })) as {
      parentCapability?: string;
      caveats?: { type?: string; value?: unknown }[];
    }[];
    for (const perm of perms) {
      if (perm.parentCapability !== "eth_accounts") continue;
      for (const caveat of perm.caveats ?? []) {
        if (caveat.type !== "restrictReturnedAccounts" || !Array.isArray(caveat.value)) continue;
        for (const value of caveat.value) {
          if (typeof value === "string") found.push(value);
        }
      }
    }
  } catch {
    /* cüzdan izin listesi vermedi */
  }
  return rememberAccounts(found);
}

const rawAddress = import.meta.env.VITE_CONTRACT_ADDRESS?.trim() ?? "";
export const contractAddress: Address | null =
  rawAddress && isAddress(rawAddress) ? rawAddress : null;

const publicClient = createPublicClient({
  chain: fuji,
  transport: fallback(
    FUJI_READ_RPCS.map((url) => http(url, { timeout: 6_000, retryCount: 0 })),
    { rank: false, retryCount: 0 },
  ),
  pollingInterval: 8_000,
});

export function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatAvax(value: bigint) {
  const amount = Number(formatEther(value));
  if (amount === 0) return "0 AVAX";
  return `${amount.toLocaleString("tr-TR", { minimumFractionDigits: 6, maximumFractionDigits: 6 })} AVAX`;
}

export function explain(error: unknown) {
  const msg = error instanceof Error ? error.message : "İşlem tamamlanamadı.";
  if (msg.includes("price")) return "Bilet tutarı eksik.";
  if (/insufficient funds/i.test(msg)) return "Bakiye bilet tutarını karşılamıyor.";
  if (msg.includes("already")) return "Bu etkinlik için kaydın zaten var.";
  if (msg.includes("sold out")) return "Kontenjan dolu.";
  if (msg.includes("handed")) return "Devredilen bilet iade edilmez.";
  if (msg.includes("owner")) return "Bu bileti yalnız sahibi iade edebilir.";
  if (msg.includes("taken")) return "Bu adresin o etkinlikte bileti var.";
  if (msg.includes("invalid")) return "Bu bilet artık geçerli değil.";
  if (/user rejected|rejected the request/i.test(msg)) return "İmza iptal edildi.";
  if (/took too long|timeout|timed out|failed to fetch/i.test(msg)) {
    return "Ağ yavaş yanıt verdi. Birazdan yeniden denenecek.";
  }
  if (msg.includes("multicall")) return "Kayıt listesi okunamadı. Sayfayı yenile.";
  return msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
}

function chainResult(error: unknown) {
  const err = error as { message?: string; shortMessage?: string };
  const msg = `${err.shortMessage ?? ""} ${err.message ?? ""}`;
  if (/user rejected|rejected the request/i.test(msg)) return "İşlem iptal edildi. Avalanche’e gönderilmedi.";
  if (/insufficient funds/i.test(msg)) return "Avalanche işlemi başarısız oldu. Bakiye yetmiyor.";
  if (msg.includes("already")) return "Avalanche işlemi başarısız oldu. Bu etkinlik için kaydın var.";
  if (msg.includes("sold out")) return "Avalanche işlemi başarısız oldu. Kontenjan dolu.";
  if (msg.includes("handed")) return "Avalanche işlemi başarısız oldu. Devredilen bilet iade edilmez.";
  if (msg.includes("owner")) return "Avalanche işlemi başarısız oldu. Bu bileti yalnız sahibi kullanabilir.";
  if (msg.includes("taken")) return "Avalanche işlemi başarısız oldu. Alıcının bu etkinlikte bileti var.";
  if (msg.includes("to")) return "Avalanche işlemi başarısız oldu. Bu adrese devredilemez.";
  if (msg.includes("invalid")) return "Avalanche işlemi başarısız oldu. Bilet geçerli değil.";
  return "Avalanche işlemi başarısız oldu.";
}

async function failedReason(from: Address, data: `0x${string}`, value?: bigint) {
  if (!contractAddress) return "Avalanche işlemi başarısız oldu.";
  try {
    await publicClient.call({ account: from, to: contractAddress, data, value });
  } catch (error) {
    return chainResult(error);
  }
  return "Avalanche işlemi başarısız oldu.";
}

const NETWORK_NOTE = "Ağ yavaş yanıt verdi. Birazdan yeniden denenecek.";

function noteFromPoll(error: unknown) {
  const text = explain(error);
  return text === NETWORK_NOTE ? NETWORK_NOTE : "";
}

function sendTransaction(
  provider: EthereumProvider,
  from: Address,
  to: Address,
  data: `0x${string}`,
  value?: bigint,
) {
  const tx: { from: Address; to: Address; data: `0x${string}`; value?: `0x${string}` } = { from, to, data };
  if (value !== undefined && value > 0n) tx.value = `0x${value.toString(16)}`;
  return provider.request({
    method: "eth_sendTransaction",
    params: [tx],
  }) as Promise<Hash>;
}

function whenWalletCloses(pending: Promise<unknown>, onClosed: () => void) {
  let settled = false;
  let leftAt = 0;
  pending.finally(() => {
    settled = true;
  });
  const onBlur = () => {
    leftAt = Date.now();
  };
  const onFocus = () => {
    if (!leftAt) return;
    const away = Date.now() - leftAt;
    leftAt = 0;
    if (away < 400) return;
    window.setTimeout(() => {
      if (!settled) onClosed();
    }, 500);
  };
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  return () => {
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
  };
}

type Session = {
  account: Address | null;
  chainId: number | null;
  onFuji: boolean;
  balance: bigint | null;
  events: EventCard[];
  mine: Mine[];
  wallets: FoundWallet[];
  ready: boolean;
  note: string;
  noteKind: "ok" | "bad" | "wait" | "";
  busyId: number | null;
  awaitingWallet: boolean;
  refundingId: string | null;
  passingId: string | null;
  connect: (wallet: FoundWallet, prompt: boolean) => Promise<void>;
  disconnect: () => void;
  ensureFuji: () => Promise<void>;
  claim: (eventId: number) => Promise<bigint | null>;
  refund: (ticketId: bigint, eventId: bigint) => Promise<boolean>;
  passTicket: (ticketId: bigint, to: Address) => Promise<boolean>;
  switchAccount: () => Promise<void>;
  accountOptions: Address[];
  accountsOpen: boolean;
  walletAccount: Address | null;
  chooseAccount: (address: Address) => void;
  closeAccounts: () => void;
  addWalletAccounts: () => Promise<void>;
  cancelSign: () => void;
  quotaLeft: number;
  clearNote: () => void;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [events, setEvents] = useState<EventCard[]>([]);
  const eventsRef = useRef<EventCard[]>([]);
  const eventsReq = useRef(0);
  const issuedAtLeast = useRef<(number | undefined)[]>([]);
  const issuedAtMost = useRef<(number | undefined)[]>([]);
  eventsRef.current = events;
  const [mine, setMine] = useState<Mine[]>([]);
  const [wallets, setWallets] = useState<FoundWallet[]>([]);
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<"ok" | "bad" | "wait" | "">("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [awaitingWallet, setAwaitingWallet] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [passingId, setPassingId] = useState<string | null>(null);
  const [accountOptions, setAccountOptions] = useState<Address[]>(() => readSavedAccounts());
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [walletAccount, setWalletAccount] = useState<Address | null>(null);
  const providerRef = useRef<EthereumProvider | null>(null);
  const metaSelected = useRef<string | null>(null);
  const manualPick = useRef(false);
  const signAttempt = useRef(0);
  const restored = useRef(false);
  const listenersRef = useRef<{
    provider: EthereumProvider;
    onAccounts: (accounts: unknown) => void;
    onChain: (hex: unknown) => void;
  } | null>(null);

  const onFuji = chainId === fuji.id;
  const ready = Boolean(contractAddress);

  const disconnect = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    const prev = listenersRef.current;
    if (prev) {
      prev.provider.removeListener?.("accountsChanged", prev.onAccounts);
      prev.provider.removeListener?.("chainChanged", prev.onChain);
      listenersRef.current = null;
    }
    providerRef.current = null;
    setAccount(null);
    setChainId(null);
    setBalance(null);
    setMine([]);
  }, []);

  const attach = useCallback(
    (provider: EthereumProvider) => {
      if (listenersRef.current?.provider === provider) return;
      if (listenersRef.current) {
        const prev = listenersRef.current;
        prev.provider.removeListener?.("accountsChanged", prev.onAccounts);
        prev.provider.removeListener?.("chainChanged", prev.onChain);
      }
      const onAccounts = (list: unknown) => {
        const next = (list as string[]).filter((item) => typeof item === "string" && item);
        setAccountOptions(rememberAccounts(next));
        if (!next[0]) {
          disconnect();
          return;
        }
        const selected = next[0].toLowerCase();
        const prev = metaSelected.current;
        metaSelected.current = selected;
        setWalletAccount(getAddress(next[0]));
        if (manualPick.current && prev === selected) return;
        manualPick.current = false;
        setMine([]);
        setBalance(null);
        setAccount(getAddress(next[0]));
      };
      const onChain = (hex: unknown) => setChainId(Number(hex as string));
      provider.on?.("accountsChanged", onAccounts);
      provider.on?.("chainChanged", onChain);
      listenersRef.current = { provider, onAccounts, onChain };
    },
    [disconnect],
  );

  const switchFuji = useCallback(async (provider: EthereumProvider) => {
    let hex = (await provider.request({ method: "eth_chainId" })) as string;
    if (hex.toLowerCase() === FUJI_HEX) return hex;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: FUJI_HEX }],
      });
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code !== 4902) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: FUJI_HEX,
            chainName: "Avalanche Fuji C-Chain",
            nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
            rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
            blockExplorerUrls: ["https://testnet.snowtrace.io"],
          },
        ],
      });
    }
    return (await provider.request({ method: "eth_chainId" })) as string;
  }, []);

  const connect = useCallback(
    async (wallet: FoundWallet, prompt: boolean) => {
      const provider = wallet.provider;
      const accounts = (await provider.request({
        method: prompt ? "eth_requestAccounts" : "eth_accounts",
      })) as string[];
      if (!accounts[0]) return;
      providerRef.current = provider;
      attach(provider);
      metaSelected.current = accounts[0].toLowerCase();
      manualPick.current = false;
      setWalletAccount(getAddress(accounts[0]));
      setAccountOptions(rememberAccounts(accounts));
      setAccount(getAddress(accounts[0]));
      const hex = prompt
        ? await switchFuji(provider)
        : ((await provider.request({ method: "eth_chainId" })) as string);
      setChainId(Number(hex));
      localStorage.setItem(SESSION_KEY, wallet.id);
      setNote("");
      setNoteKind("");
    },
    [attach, switchFuji],
  );

  const ensureFuji = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider) return;
    const hex = await switchFuji(provider);
    setChainId(Number(hex));
  }, [switchFuji]);

  const commitEvents = useCallback((cards: EventCard[]) => {
    setEvents(
      cards.map((card, index) => {
        let issued = card.issued;
        const least = issuedAtLeast.current[index];
        const most = issuedAtMost.current[index];
        if (least !== undefined) {
          if (issued >= least) issuedAtLeast.current[index] = undefined;
          else issued = least;
        }
        if (most !== undefined) {
          if (issued <= most) issuedAtMost.current[index] = undefined;
          else issued = most;
        }
        return issued === card.issued ? card : { ...card, issued };
      }),
    );
  }, []);

  const loadEvents = useCallback(async () => {
    if (!contractAddress) {
      setEvents([]);
      return;
    }
    const req = ++eventsReq.current;
    const count = await publicClient.readContract({
      address: contractAddress,
      abi: tribunAbi,
      functionName: "eventCount",
    });
    const total = Number(count);
    const cards = await Promise.all(
      Array.from({ length: total }, async (_, index) => {
        const row = await publicClient.readContract({
          address: contractAddress,
          abi: tribunAbi,
          functionName: "eventInfo",
          args: [BigInt(index)],
        });
        return { name: row[0], whenLabel: row[1], supply: Number(row[2]), issued: Number(row[3]) };
      }),
    );
    if (req !== eventsReq.current) return;
    commitEvents(cards);
  }, [commitEvents]);

  const loadMine = useCallback(async (who: Address) => {
    if (!contractAddress) {
      setMine([]);
      return;
    }
    const ids = await publicClient.readContract({
      address: contractAddress,
      abi: tribunAbi,
      functionName: "ticketsOf",
      args: [who],
    });
    const rows = await Promise.all(
      ids.map(async (id) => {
        const [row, handed] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: tribunAbi,
            functionName: "verify",
            args: [id],
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: tribunAbi,
            functionName: "handed",
            args: [id],
          }),
        ]);
        return { id, eventId: row[1], owner: row[2], handed };
      }),
    );
    setMine(rows);
  }, []);

  const say = useCallback((text: string, kind: "ok" | "bad" | "wait" | "") => {
    setNote(text);
    setNoteKind(kind);
  }, []);

  const applyAccount = useCallback((address: Address) => {
    const meta = metaSelected.current;
    manualPick.current = meta !== null && address.toLowerCase() !== meta;
    setMine([]);
    setBalance(null);
    setAccount(address);
    setAccountsOpen(false);
  }, []);

  const switchAccount = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider) {
      say("Cüzdan bağlı değil. Sayfayı yenileyip yeniden bağlan.", "bad");
      return;
    }
    const list = await readWalletAccounts(provider);
    setAccountOptions(list);
    setAccountsOpen(true);
  }, [say]);

  const closeAccounts = useCallback(() => setAccountsOpen(false), []);

  const addWalletAccounts = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider) {
      say("Cüzdan bağlı değil. Sayfayı yenileyip yeniden bağlan.", "bad");
      return;
    }
    try {
      await provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code === 4001) {
        say("Hesap listesi değişmedi.", "bad");
        return;
      }
      try {
        await provider.request({ method: "eth_requestAccounts" });
      } catch (err) {
        if ((err as { code?: number }).code === 4001) say("Hesap listesi değişmedi.", "bad");
        return;
      }
    }
    const list = await readWalletAccounts(provider);
    setAccountOptions(list);
    setAccountsOpen(true);
  }, [say]);

  useEffect(() => {
    if (!note || noteKind === "wait") return;
    const timer = window.setTimeout(() => {
      setNote("");
      setNoteKind("");
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [note, noteKind]);

  const cancelSign = useCallback(() => {
    signAttempt.current += 1;
    setBusyId(null);
    setAwaitingWallet(false);
    setRefundingId(null);
    setPassingId(null);
    say("İşlem iptal edildi. Avalanche’e gönderilmedi.", "bad");
  }, [say]);

  const claim = useCallback(
    async (eventId: number) => {
      const provider = providerRef.current;
      if (!provider || !account || !contractAddress) return null;
      const attempt = ++signAttempt.current;
      const data = encodeFunctionData({
        abi: tribunAbi,
        functionName: "claim",
        args: [BigInt(eventId)],
      });
      const pending = sendTransaction(provider, account, contractAddress, data, TICKET_PRICE);
      const beforePromise = publicClient.readContract({
        address: contractAddress,
        abi: tribunAbi,
        functionName: "ticketsOf",
        args: [account],
      });
      let raised = false;
      setBusyId(eventId);
      setAwaitingWallet(true);
      say("MetaMask’ta işlemi onayla.", "wait");
      const stopWatch = whenWalletCloses(pending, () => {
        if (attempt !== signAttempt.current) return;
        setBusyId(null);
        setAwaitingWallet(false);
        setRefundingId(null);
        say("İşlem iptal edildi. Avalanche’e gönderilmedi.", "bad");
      });
      try {
        const hash = await pending;
        if (attempt !== signAttempt.current) return null;
        window.focus();
        setAwaitingWallet(false);
        const beforeIssued = eventsRef.current[eventId]?.issued ?? 0;
        issuedAtLeast.current[eventId] = beforeIssued + 1;
        issuedAtMost.current[eventId] = undefined;
        eventsReq.current += 1;
        raised = true;
        setEvents((current) =>
          current.map((event, index) =>
            index === eventId ? { ...event, issued: event.issued + 1 } : event,
          ),
        );
        setBalance((current) => (current === null ? current : current - TICKET_PRICE));
        say("İşlem Avalanche Fuji’ye gönderildi. Onay bekleniyor.", "wait");
        const before = await beforePromise;
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (attempt !== signAttempt.current) return null;
        if (receipt.status !== "success") {
          issuedAtLeast.current[eventId] = undefined;
          say(await failedReason(account, data, TICKET_PRICE), "bad");
          await loadEvents();
          const value = await publicClient.getBalance({ address: account });
          setBalance(value);
          return null;
        }
        await loadEvents();
        const after = await publicClient.readContract({
          address: contractAddress,
          abi: tribunAbi,
          functionName: "ticketsOf",
          args: [account],
        });
        await loadMine(account);
        const value = await publicClient.getBalance({ address: account });
        setBalance(value);
        const fresh = after.find((id) => !before.some((prev) => prev === id)) ?? null;
        if (fresh) {
          holdRefund(fresh.toString());
          forgetTrail(fresh);
        }
        say("Avalanche işlemi başarılı oldu.", "ok");
        return fresh;
      } catch (error) {
        if (attempt === signAttempt.current) {
          if (raised) issuedAtLeast.current[eventId] = undefined;
          say(chainResult(error), "bad");
          await loadEvents();
        }
        return null;
      } finally {
        stopWatch();
        if (attempt === signAttempt.current) {
          setBusyId(null);
          setAwaitingWallet(false);
        }
      }
    },
    [account, loadEvents, loadMine, say],
  );

  const refund = useCallback(
    async (ticketId: bigint, eventId: bigint) => {
      const provider = providerRef.current;
      if (!provider || !account || !contractAddress) return false;
      const attempt = ++signAttempt.current;
      const data = encodeFunctionData({
        abi: tribunAbi,
        functionName: "refund",
        args: [ticketId],
      });
      const pending = sendTransaction(provider, account, contractAddress, data);
      const eventIndex = Number(eventId);
      const beforeIssued = eventsRef.current[eventIndex]?.issued ?? 0;
      issuedAtMost.current[eventIndex] = Math.max(0, beforeIssued - 1);
      issuedAtLeast.current[eventIndex] = undefined;
      eventsReq.current += 1;
      setRefundingId(ticketId.toString());
      setAwaitingWallet(true);
      say("MetaMask’ta işlemi onayla.", "wait");
      setEvents((current) =>
        current.map((event, index) =>
          index === eventIndex ? { ...event, issued: Math.max(0, event.issued - 1) } : event,
        ),
      );
      setMine((current) => current.filter((ticket) => ticket.id !== ticketId));
      const stopWatch = whenWalletCloses(pending, () => {
        if (attempt !== signAttempt.current) return;
        issuedAtMost.current[eventIndex] = undefined;
        setAwaitingWallet(false);
        setRefundingId(null);
        say("İşlem iptal edildi. Avalanche’e gönderilmedi.", "bad");
        loadEvents().catch(() => undefined);
        loadMine(account).catch(() => undefined);
      });
      try {
        const hash = await pending;
        if (attempt !== signAttempt.current) return false;
        window.focus();
        setAwaitingWallet(false);
        setBalance((current) => (current === null ? current : current + TICKET_PRICE));
        say("İşlem Avalanche Fuji’ye gönderildi. Onay bekleniyor.", "wait");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (attempt !== signAttempt.current) return false;
        if (receipt.status !== "success") {
          issuedAtMost.current[eventIndex] = undefined;
          say(await failedReason(account, data), "bad");
          await loadEvents();
          await loadMine(account);
          const value = await publicClient.getBalance({ address: account });
          setBalance(value);
          return false;
        }
        await loadEvents();
        await loadMine(account);
        const value = await publicClient.getBalance({ address: account });
        setBalance(value);
        forgetTrail(ticketId);
        say("Avalanche işlemi başarılı oldu.", "ok");
        return true;
      } catch (error) {
        if (attempt === signAttempt.current) {
          issuedAtMost.current[eventIndex] = undefined;
          say(chainResult(error), "bad");
          await loadEvents();
          await loadMine(account);
        }
        return false;
      } finally {
        stopWatch();
        if (attempt === signAttempt.current) {
          setAwaitingWallet(false);
          setRefundingId(null);
        }
      }
    },
    [account, loadEvents, loadMine, say],
  );

  const passTicket = useCallback(
    async (ticketId: bigint, to: Address) => {
      const provider = providerRef.current;
      if (!account || !isAddress(to, { strict: false })) return false;
      if (!provider || !contractAddress) {
        say("Cüzdan bağlı değil. Sayfayı yenileyip yeniden bağlan.", "bad");
        return false;
      }
      if (to.toLowerCase() === account.toLowerCase()) {
        say("Bilet zaten bu cüzdanda.", "bad");
        return false;
      }
      const attempt = ++signAttempt.current;
      const data = encodeFunctionData({
        abi: tribunAbi,
        functionName: "transferFrom",
        args: [account, to, ticketId],
      });
      const pending = sendTransaction(provider, account, contractAddress, data);
      const previous = mine;
      setPassingId(ticketId.toString());
      setAwaitingWallet(true);
      say("MetaMask’ta işlemi onayla.", "wait");
      setMine((current) => current.filter((ticket) => ticket.id !== ticketId));
      const stopWatch = whenWalletCloses(pending, () => {
        if (attempt !== signAttempt.current) return;
        setAwaitingWallet(false);
        setPassingId(null);
        setMine(previous);
        say("İşlem iptal edildi. Avalanche’e gönderilmedi.", "bad");
      });
      try {
        const hash = await pending;
        if (attempt !== signAttempt.current) return false;
        window.focus();
        setAwaitingWallet(false);
        say("İşlem Avalanche Fuji’ye gönderildi. Onay bekleniyor.", "wait");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (attempt !== signAttempt.current) return false;
        if (receipt.status !== "success") {
          say(await failedReason(account, data), "bad");
          await loadMine(account);
          return false;
        }
        await loadMine(account);
        forgetTrail(ticketId);
        say("Avalanche işlemi başarılı oldu.", "ok");
        return true;
      } catch (error) {
        if (attempt === signAttempt.current) {
          say(chainResult(error), "bad");
          await loadMine(account);
        }
        return false;
      } finally {
        stopWatch();
        if (attempt === signAttempt.current) {
          setAwaitingWallet(false);
          setPassingId(null);
        } else if (account) {
          loadMine(account).catch(() => undefined);
        }
      }
    },
    [account, loadMine, mine, say],
  );

  useEffect(() => {
    let stop = false;
    let reading = false;
    const read = () => {
      if (stop || reading) return;
      reading = true;
      loadEvents()
        .then(() =>
          setNote((current) => {
            if (current !== NETWORK_NOTE) return current;
            setNoteKind("");
            return "";
          }),
        )
        .catch((error: unknown) => {
          const next = noteFromPoll(error);
          if (!next) return;
          setNote((current) => {
            if (current && current !== NETWORK_NOTE) return current;
            setNoteKind("bad");
            return next;
          });
        })
        .finally(() => {
          reading = false;
        });
    };
    let timer = 0;
    const start = () => {
      window.clearInterval(timer);
      if (document.hidden) return;
      read();
      timer = window.setInterval(read, 12000);
    };
    const onVis = () => {
      if (document.hidden) {
        window.clearInterval(timer);
        return;
      }
      start();
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadEvents]);

  useEffect(() => watchWallets(setWallets), []);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved || restored.current) return;
    const wallet = wallets.find((item) => item.id === saved);
    if (!wallet) return;
    restored.current = true;
    connect(wallet, false).catch((error: unknown) => setNote(explain(error)));
  }, [wallets, connect]);

  const seenAccount = useRef<string | null>(null);
  useEffect(() => {
    if (!account) return;
    const next = account.toLowerCase();
    if (seenAccount.current && seenAccount.current !== next) {
      setMine([]);
      setBalance(null);
    }
    seenAccount.current = next;
    loadMine(account).catch((error: unknown) => setNote(explain(error)));
  }, [account, loadMine]);

  useEffect(() => {
    const onFocus = () => {
      const provider = providerRef.current;
      if (!provider) return;
      provider
        .request({ method: "eth_accounts" })
        .then((list) => {
          if (!Array.isArray(list)) return;
          const accounts = list.filter((item) => typeof item === "string" && item);
          setAccountOptions(rememberAccounts(accounts));
          if (!accounts[0]) return;
          setWalletAccount(getAddress(accounts[0]));
          metaSelected.current = accounts[0].toLowerCase();
        })
        .catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (!account) return;
    let stop = false;
    let reading = false;
    const read = async () => {
      if (reading) return;
      reading = true;
      try {
        const value = await publicClient.getBalance({ address: account });
        if (stop) return;
        setBalance(value);
        setNote((current) => {
          if (current !== NETWORK_NOTE) return current;
          setNoteKind("");
          return "";
        });
      } finally {
        reading = false;
      }
    };
    const fail = (error: unknown) => {
      const next = noteFromPoll(error);
      if (!next) return;
      setNote((current) => {
        if (current && current !== NETWORK_NOTE) return current;
        setNoteKind("bad");
        return next;
      });
    };
    let timer = 0;
    const start = () => {
      window.clearInterval(timer);
      if (document.hidden) return;
      read().catch(fail);
      timer = window.setInterval(() => {
        read().catch(fail);
      }, 8000);
    };
    const onVis = () => {
      if (document.hidden) {
        window.clearInterval(timer);
        return;
      }
      start();
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [account]);

  const value = useMemo<Session>(
    () => ({
      account,
      chainId,
      onFuji,
      balance,
      events,
      mine,
      wallets,
      ready,
      note,
      noteKind,
      busyId,
      awaitingWallet,
      refundingId,
      passingId,
      connect,
      disconnect,
      ensureFuji,
      claim,
      refund,
      passTicket,
      switchAccount,
      accountOptions,
      accountsOpen,
      walletAccount,
      chooseAccount: applyAccount,
      closeAccounts,
      addWalletAccounts,
      cancelSign,
      quotaLeft: events.reduce((sum, event) => sum + (event.supply - event.issued), 0),
      clearNote: () => {
        setNote("");
        setNoteKind("");
      },
    }),
    [
      account,
      chainId,
      onFuji,
      balance,
      events,
      mine,
      wallets,
      ready,
      note,
      noteKind,
      busyId,
      awaitingWallet,
      refundingId,
      passingId,
      connect,
      disconnect,
      ensureFuji,
      claim,
      refund,
      passTicket,
      switchAccount,
      accountOptions,
      accountsOpen,
      walletAccount,
      applyAccount,
      closeAccounts,
      addWalletAccounts,
      cancelSign,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Oturum yok");
  return value;
}

export type TrailStep = { from: Address; to: Address; hash: Hash };

const trailCache = new Map<string, TrailStep[]>();

export function forgetTrail(ticketId: bigint) {
  trailCache.delete(ticketId.toString());
}

export function fujiTicketUrl(ticketId: bigint) {
  if (!contractAddress) return "";
  return `https://testnet.snowtrace.io/nft/${contractAddress}/${ticketId.toString()}`;
}

export function fujiTxUrl(hash: Hash) {
  return `https://testnet.snowtrace.io/tx/${hash}`;
}

export function trailLabel(step: TrailStep) {
  if (step.from.toLowerCase() === zeroAddress) return "Basıldı";
  if (step.to.toLowerCase() === zeroAddress) return "Yakıldı";
  return `${short(step.from)} → ${short(step.to)}`;
}

export async function ticketTrail(ticketId: bigint): Promise<TrailStep[]> {
  const key = ticketId.toString();
  const cached = trailCache.get(key);
  if (cached) return cached;
  if (!contractAddress) return [];
  const latest = await publicClient.getBlockNumber();
  const span = 400_000n;
  const fromBlock = latest > span ? latest - span : 0n;
  const logs = await publicClient.getContractEvents({
    address: contractAddress,
    abi: tribunAbi,
    eventName: "Transfer",
    args: { tokenId: ticketId },
    fromBlock,
    toBlock: latest,
  });
  const steps = logs.flatMap((log) => {
    const from = log.args.from;
    const to = log.args.to;
    const hash = log.transactionHash;
    if (!from || !to || !hash) return [];
    return [{ from, to, hash }];
  });
  trailCache.set(key, steps);
  return steps;
}

export async function lookupTicket(ticketId: bigint) {
  if (!contractAddress) throw new Error("Kontrat adresi yok");
  const row = await publicClient.readContract({
    address: contractAddress,
    abi: tribunAbi,
    functionName: "verify",
    args: [ticketId],
  });
  if (!row[0]) return null;
  const eventRow = await publicClient.readContract({
    address: contractAddress,
    abi: tribunAbi,
    functionName: "eventInfo",
    args: [row[1]],
  });
  return {
    eventId: row[1],
    owner: row[2],
    name: eventRow[0],
    whenLabel: eventRow[1],
  };
}
