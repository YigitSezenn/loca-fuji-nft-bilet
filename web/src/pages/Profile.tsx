import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAddress, isAddress } from "viem";
import { preferredWallet } from "../chain";
import MetaMaskLink from "../MetaMaskLink";
import { metaFor } from "../eventMeta";
import { refundLeft } from "../refundHold";
import { useSession } from "../session";
import CopyNo from "../CopyNo";
import TicketChain from "../TicketChain";
import { formatTicketNo } from "../ticketNo";

export default function Profile() {
  const { account, mine, events, wallets, connect, refund, passTicket, switchAccount, awaitingWallet, refundingId, passingId, cancelSign } =
    useSession();
  const [now, setNow] = useState(() => Date.now());
  const [toById, setToById] = useState<Record<string, string>>({});
  const [passHint, setPassHint] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!account) {
    return (
      <section className="page page-head">
        <p className="eyebrow">Profil</p>
        <h1>Biletlerin burada durur.</h1>
        {preferredWallet(wallets) ? (
          <button className="solid" type="button" onClick={() => connect(preferredWallet(wallets)!, true)}>
            MetaMask ile bağlan
          </button>
        ) : (
          <MetaMaskLink />
        )}
      </section>
    );
  }

  return (
    <div className="page">
      <section className="page-head">
        <p className="eyebrow">Profil</p>
        <h1>Biletlerim</h1>
        <p>Hesabı listeden seç. Biletler ve bakiye o adrese göre gelir.</p>
        <button className="solid" type="button" onClick={() => void switchAccount()}>
          Hesap değiştir
        </button>
      </section>
      {mine.length === 0 && (
        <p className="empty">
          Bu hesapta bilet yok. <Link to="/">Etkinlik seç.</Link>
        </p>
      )}
      <div className="stubs">
        {mine.map((ticket) => {
          const event = events[Number(ticket.eventId)];
          const meta = metaFor(Number(ticket.eventId));
          const wait = refundLeft(ticket.id.toString(), now);
          const id = ticket.id.toString();
          const draft = toById[id] ?? "";
          const busy = refundingId !== null || passingId !== null;
          const handOff = () => {
            if (wait > 0) return;
            const clean = draft.replace(/\s+/g, "");
            if (!isAddress(clean, { strict: false })) {
              setPassHint({ id, text: "Geçerli bir cüzdan adresi yaz." });
              return;
            }
            const to = getAddress(clean);
            if (to.toLowerCase() === account.toLowerCase()) {
              setPassHint({ id, text: "Bilet zaten bu cüzdanda." });
              return;
            }
            setPassHint(null);
            passTicket(ticket.id, to);
          };
          return (
            <article className="stub" key={ticket.id.toString()}>
              <div>
                <p className="eyebrow">{meta.category}</p>
                <h2>{event?.name ?? "Etkinlik"}</h2>
                <p>{event?.whenLabel}</p>
                <p>
                  {meta.venue} · {meta.city}
                </p>
                <TicketChain id={ticket.id} />
              </div>
              <div className="stub-no">
                <span>Bilet no</span>
                <span className="no-row">
                  <strong>{formatTicketNo(ticket.id)}</strong>
                  <CopyNo id={ticket.id} />
                </span>
                <Link to={`/sorgula?no=${ticket.id.toString()}`}>Bu numarayı sorgula</Link>
                {ticket.handed ? (
                  <p className="pass-hint">Devredildiği için iade kapalı.</p>
                ) : (
                  <button
                    className="ghost"
                    type="button"
                    disabled={busy || wait > 0}
                    onClick={() => {
                      refund(ticket.id, ticket.eventId);
                    }}
                  >
                    {refundingId === id
                      ? awaitingWallet
                        ? "MetaMask’ta onayla"
                        : "İade ediliyor…"
                      : wait > 0
                        ? `${wait} sn sonra iade`
                        : "İade et"}
                  </button>
                )}
                <form
                  className="pass"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handOff();
                  }}
                >
                  <input
                    aria-label="Alıcı adresi"
                    placeholder="Alıcı adresi"
                    value={draft}
                    disabled={busy || wait > 0}
                    onChange={(event) => {
                      setPassHint(null);
                      setToById((current) => ({ ...current, [id]: event.target.value.replace(/\s+/g, "") }));
                    }}
                  />
                  <button className="ghost" type="button" disabled={busy || wait > 0} onClick={handOff}>
                    {passingId === id
                      ? awaitingWallet
                        ? "MetaMask’ta onayla"
                        : "Devrediliyor…"
                      : wait > 0
                        ? `${wait} sn sonra devret`
                        : "Devret"}
                  </button>
                  {passHint?.id === id && <p className="pass-hint">{passHint.text}</p>}
                </form>
                {(refundingId === id || passingId === id) && awaitingWallet && (
                  <button className="text-btn" type="button" onClick={cancelSign}>
                    Vazgeç
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
