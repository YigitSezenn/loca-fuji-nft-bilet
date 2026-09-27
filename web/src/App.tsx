import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { CATS, CITIES, NAV, whenOrder } from "./eventMeta";
import { CopyAddr } from "./CopyNo";
import { formatAvax, short, useSession } from "./session";

const THEME_KEY = "tribun.theme";
const ID_KEY = "tribun.showWalletId";
const BAL_KEY = "tribun.showBalance";
const SPLASH_KEY = "tribun.splash";

function shouldSplash() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    if (sessionStorage.getItem(SPLASH_KEY) === "1") return false;
  } catch {
    return true;
  }
  return true;
}

function Sun() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 1.2v1.8M8 13v1.8M1.2 8H3M13 8h1.8M3.1 3.1l1.3 1.3M11.6 11.6l1.3 1.3M3.1 12.9l1.3-1.3M11.6 4.4l1.3-1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10.2 1.6a5.8 5.8 0 1 0 4.2 9.6A6.2 6.2 0 0 1 10.2 1.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Mark() {
  return (
    <svg className="mark" width="52" height="32" viewBox="0 0 52 32" aria-hidden="true">
      <path
        className="mark-bg"
        fillRule="evenodd"
        d="M16 2h22a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H16a7 7 0 0 1-7-7V9a7 7 0 0 1 7-7zM2.5 16a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0zM38.5 16a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0z"
      />
      <path className="mark-ink" d="M26 8v16" fill="none" strokeWidth="1.6" strokeDasharray="2.2 2.4" strokeLinecap="round" />
    </svg>
  );
}

function Avatar({ address }: { address: string }) {
  const seed = Number.parseInt(address.slice(2, 10), 16);
  const hue = seed % 360;
  const id = `avatar-${address.slice(2, 8)}`;
  return (
    <svg className="avatar" viewBox="0 0 40 40" role="img" aria-label="Kullanıcı">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 70% 62%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 36) % 360} 64% 42%)`} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${id})`} />
      <circle cx="20" cy="16" r="6.2" fill="#fff" />
      <path d="M7.5 35.5c1.8-7.4 6.6-11 12.5-11s10.7 3.6 12.5 11" fill="#fff" />
    </svg>
  );
}

function Eye({ off = false }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M1.4 8S3.6 3.8 8 3.8 14.6 8 14.6 8 12.4 12.2 8 12.2 1.4 8 1.4 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {off && <path d="M3 13 13 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

function initialTheme(): "light" | "dark" {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const {
    account,
    balance,
    onFuji,
    note,
    noteKind,
    awaitingWallet,
    events,
    disconnect,
    ensureFuji,
    switchAccount,
    accountOptions,
    accountsOpen,
    walletAccount,
    chooseAccount,
    closeAccounts,
    addWalletAccounts,
  } = useSession();
  const [theme, setTheme] = useState(initialTheme);
  const [showId, setShowId] = useState(() => localStorage.getItem(ID_KEY) !== "0");
  const [showBal, setShowBal] = useState(() => localStorage.getItem(BAL_KEY) !== "0");
  const [splash, setSplash] = useState(shouldSplash);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qParam = params.get("q") ?? "";
  const [q, setQ] = useState(qParam);
  const city = params.get("sehir") ?? "";
  const month = params.get("ay") ?? "";
  const cat = params.get("kat") ?? "";
  const accountChoices = useMemo(() => {
    const map = new Map<string, (typeof accountOptions)[number]>();
    for (const addr of accountOptions) map.set(addr.toLowerCase(), addr);
    if (account) map.set(account.toLowerCase(), account);
    const list = [...map.values()];
    if (!account) return list;
    const key = account.toLowerCase();
    return list.sort((a, b) => {
      if (a.toLowerCase() === key) return -1;
      if (b.toLowerCase() === key) return 1;
      return a.localeCompare(b);
    });
  }, [account, accountOptions]);

  useEffect(() => {
    if (!accountsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAccounts();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accountsOpen, closeAccounts]);

  const dates = useMemo(() => {
    const labels = [...new Set(events.map((event) => event.whenLabel).filter(Boolean))];
    if (month && !labels.includes(month)) labels.push(month);
    labels.sort((a, b) => whenOrder(a) - whenOrder(b));
    return labels;
  }, [events, month]);
  const filterSummary = [city, month, cat].filter(Boolean).join(" · ") || "Tümü";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!splash) return;
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      /* sekme kaydı kapalıysa açılış bir kez yine de oynar */
    }
    const timer = window.setTimeout(() => setSplash(false), 1600);
    const hide = () => setSplash(false);
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) hide();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") hide();
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pointerdown", hide, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pointerdown", hide, true);
    };
  }, [splash]);

  useEffect(() => {
    if (splash && (awaitingWallet || noteKind === "wait")) setSplash(false);
  }, [splash, awaitingWallet, noteKind]);

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  const dark = theme === "dark";

  function go(next: { q?: string; sehir?: string; ay?: string; kat?: string }) {
    const search = new URLSearchParams();
    const query = (next.q ?? q).trim();
    const sehir = next.sehir ?? city;
    const ay = next.ay ?? month;
    const kat = next.kat ?? cat;
    if (query) search.set("q", query);
    if (sehir) search.set("sehir", sehir);
    if (ay) search.set("ay", ay);
    if (kat) search.set("kat", kat);
    navigate({ pathname: "/", search: search.toString() });
  }

  function linkWith(next: { kat?: string }) {
    const search = new URLSearchParams();
    const query = q.trim();
    const kat = next.kat ?? cat;
    if (query) search.set("q", query);
    if (city) search.set("sehir", city);
    if (month) search.set("ay", month);
    if (kat) search.set("kat", kat);
    const text = search.toString();
    return text ? `/?${text}` : "/";
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    go({ q });
  }

  return (
    <div className="shell">
      {splash && (
        <button className="splash" type="button" onClick={() => setSplash(false)} aria-label="Açılışı kapat">
          <Mark />
          <strong>loca</strong>
          <span>Bilet adresine yazılır.</span>
        </button>
      )}
      <header className="site-head">
        <div className="util">
          <div className="util-inner">
            <p>Dil: TR · Bölge: Türkiye</p>
            <div className="util-actions">
              <button
                className="theme-toggle"
                type="button"
                aria-pressed={dark}
                aria-label={dark ? "Açık tema" : "Koyu tema"}
                onClick={() => setTheme(dark ? "light" : "dark")}
              >
                {dark ? <Sun /> : <Moon />}
              </button>
            </div>
          </div>
        </div>
        <div className="brand">
          <div className="brand-inner">
            <div className="brand-top">
              <NavLink className="logo" to="/" end>
                <Mark />
                <span className="logo-type">
                  <span>loca</span>
                  <small>fuji</small>
                </span>
              </NavLink>
              <form className="finder" onSubmit={onSearch}>
                <input
                  aria-label="Etkinlik, sanatçı ya da mekan arayın"
                  placeholder="Etkinlik, sanatçı ya da mekan arayın"
                  value={q}
                  onChange={(event) => {
                  const value = event.target.value;
                  setQ(value);
                  go({ q: value });
                }}
                />
              </form>
              {account && (
                <div className="wallet">
                  <div className="wallet-who">
                    <Avatar address={account} />
                    <span className="wallet-id">
                      <small>Cüzdan</small>
                      <strong>{showId ? short(account) : "••••••"}</strong>
                    </span>
                    <CopyAddr address={account} className="wallet-copy" />
                    <button
                      className="wallet-eye"
                      type="button"
                      aria-pressed={showId}
                      aria-label={showId ? "Cüzdan adresini gizle" : "Cüzdan adresini göster"}
                      onClick={() =>
                        setShowId((current) => {
                          const next = !current;
                          localStorage.setItem(ID_KEY, next ? "1" : "0");
                          return next;
                        })
                      }
                    >
                      <Eye off={!showId} />
                    </button>
                  </div>
                  <div className="wallet-fuji">
                    <span className={`wallet-net ${onFuji ? "ok" : ""}`}>{onFuji ? "Fuji" : "Ağ Fuji değil"}</span>
                    <span className="wallet-sum">
                      <strong title="Fuji AVAX bakiyesi. Bilet tutarı buradan düşer.">
                        {balance === null ? "…" : showBal ? formatAvax(balance) : "••••••"}
                      </strong>
                      <button
                        className="wallet-eye"
                        type="button"
                        aria-pressed={showBal}
                        aria-label={showBal ? "Bakiyeyi gizle" : "Bakiyeyi göster"}
                        onClick={() =>
                          setShowBal((current) => {
                            const next = !current;
                            localStorage.setItem(BAL_KEY, next ? "1" : "0");
                            return next;
                          })
                        }
                      >
                        <Eye off={!showBal} />
                      </button>
                    </span>
                  </div>
                  {!onFuji && (
                    <button type="button" onClick={() => ensureFuji()}>
                      Fuji ağına geç
                    </button>
                  )}
                  <button type="button" onClick={() => void switchAccount()}>
                    Hesap değiştir
                  </button>
                  <button type="button" onClick={disconnect}>
                    Çıkış
                  </button>
                </div>
              )}
              <div className="account">
                <Link to="/sorgula">Sorgula</Link>
                <Link to="/profil">Biletlerim</Link>
              </div>
            </div>
            <nav className="cats" aria-label="Kategoriler">
              {NAV.map((name) => (
                <Link
                  key={name}
                  className={cat === name ? "on" : ""}
                  to={linkWith({ kat: cat === name ? "" : name })}
                >
                  {name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <form
          className={`filters${filtersOpen ? " open" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            setFiltersOpen(false);
            go({});
          }}
        >
          <div className="filter-inner">
            <button
              className="filters-toggle"
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="filter-panel"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <span>Keşfet</span>
              <strong>{filterSummary}</strong>
              <svg className="chev" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
                <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <div className="filters-body" id="filter-panel">
            <div className={`filter-field city-field${citiesOpen ? " open" : ""}`}>
              <button
                className="city-toggle"
                type="button"
                aria-expanded={citiesOpen}
                aria-controls="city-choices"
                onClick={() => setCitiesOpen((open) => !open)}
              >
                <span>Şehir</span>
                <strong>{city || "Tümü"}</strong>
                <svg className="chev" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
                  <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <span className="city-label">Şehir</span>
              <div className="city-row" id="city-choices" role="group" aria-label="Şehir">
                <button
                  type="button"
                  className={city === "" ? "on" : ""}
                  onClick={() => {
                    go({ sehir: "" });
                    setCitiesOpen(false);
                    setFiltersOpen(false);
                  }}
                >
                  Tümü
                </button>
                {CITIES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={city === name ? "on" : ""}
                    onClick={() => {
                      go({ sehir: name });
                      setCitiesOpen(false);
                      setFiltersOpen(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <label className="filter-field">
              <span>Tarih</span>
              <select
                aria-label="Tarih"
                value={dates.includes(month) ? month : ""}
                onChange={(event) => {
                  go({ ay: event.target.value });
                  setFiltersOpen(false);
                }}
              >
                <option value="">Tüm tarihler</option>
                {dates.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Kategori</span>
              <select
                aria-label="Kategori"
                value={cat}
                onChange={(event) => {
                  go({ kat: event.target.value });
                  setFiltersOpen(false);
                }}
              >
                <option value="">Tüm kategoriler</option>
                {CATS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button className="discover" type="submit">
              Keşfet
            </button>
            </div>
          </div>
        </form>
      </header>
      {accountsOpen && account && (
        <div className="sheet-back" onMouseDown={closeAccounts}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hesap-baslik"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="hesap-baslik">Hesap seç</h2>
            <p>Bağlı cüzdanın hesapları. Birini seçince biletler ve bakiye o adrese göre gelir.</p>
            <ul className="account-list">
              {accountChoices.map((addr) => {
                const on = addr.toLowerCase() === account.toLowerCase();
                const inWallet = walletAccount?.toLowerCase() === addr.toLowerCase();
                return (
                  <li key={addr} className={on ? "on" : ""}>
                    <button type="button" onClick={() => chooseAccount(addr)}>
                      <strong>{short(addr)}</strong>
                      <span>{addr}</span>
                      <em>
                        {on ? "Sitede açık" : "Bu hesaba geç"}
                        {inWallet ? " · MetaMask’ta seçili" : ""}
                      </em>
                    </button>
                    <CopyAddr address={addr} />
                  </li>
                );
              })}
            </ul>
            <p className="sheet-note">
              Hesap listede yoksa diğer hesapları ekle. MetaMask o pencerede Bağlan yazar; bu yeni bir giriş değil, işaretlediğin hesaplar listeye girer.
            </p>
            <div className="sheet-actions">
              <button className="solid" type="button" onClick={() => void addWalletAccounts()}>
                Diğer hesapları ekle
              </button>
              <button className="ghost" type="button" onClick={closeAccounts}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      <main>
        {note && (
          <p key={note} className={`toast ${noteKind}`} role="status">
            {note}
          </p>
        )}
        <Outlet />
      </main>
      <footer className="site-foot">
        <div className="page foot">
          <div>
            <strong className="foot-brand">
              <Mark />
              loca
            </strong>
            <p>Bilet cüzdanına yazılır. Tutar Fuji bakiyesinden düşer, iade edilince geri gelir.</p>
          </div>
          <nav>
            <Link to="/">Etkinlikler</Link>
            <Link to="/sorgula">Bilet sorgula</Link>
            <Link to="/profil">Biletlerim</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
