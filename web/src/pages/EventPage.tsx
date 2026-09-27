import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { clearAgeProof, hasAgeProof, saveAgeProof } from "../ageProof";
import { preferredWallet } from "../chain";
import MetaMaskLink from "../MetaMaskLink";
import { cover, metaFor } from "../eventMeta";
import { TICKET_PRICE } from "../price";
import { formatAvax, useSession } from "../session";

export default function EventPage() {
  const { id } = useParams();
  const index = Number(id);
  const navigate = useNavigate();
  const { events, account, onFuji, ready, busyId, awaitingWallet, claim, wallets, connect, ensureFuji, cancelSign } =
    useSession();
  const wallet = preferredWallet(wallets);
  const event = Number.isInteger(index) ? events[index] : undefined;
  const meta = metaFor(index);
  const [proved, setProved] = useState(false);

  useEffect(() => {
    setProved(account ? hasAgeProof(account) : false);
  }, [account]);

  if (!event && events.length === 0) {
    return (
      <section className="page detail">
        <div className="skeleton" />
        <div className="skeleton" />
      </section>
    );
  }

  if (!event) {
    return (
      <section className="page page-head">
        <h1>Etkinlik bulunamadı.</h1>
        <Link to="/">Etkinliklere dön</Link>
      </section>
    );
  }

  const left = event.supply - event.issued;
  const filled = event.supply === 0 ? 0 : Math.round((left / event.supply) * 100);
  const needsProof = Boolean(meta.adult && account && !proved);

  async function take() {
    const ticketId = await claim(index);
    if (ticketId !== null) {
      navigate("/profil", { state: { fresh: ticketId.toString() } });
    }
  }

  return (
    <article className="page detail">
      <Link className="back" to="/">
        Etkinlikler
      </Link>
      <div className="hero-poster" style={cover(meta.image, "hero")}>
        <p>{meta.adult ? "18+ konser" : meta.category}</p>
        <h1>{event.name}</h1>
        <span>
          {meta.city} · {meta.venue}
        </span>
      </div>
      <div className="detail-grid">
        <div>
          <p className="eyebrow">Tarih</p>
          <h2>{event.whenLabel}</h2>
          <p>{meta.blurb}</p>
          <ul className="facts">
            <li>Mekân: {meta.venue}</li>
            <li>Şehir: {meta.city}</li>
            <li>Kontenjan: {event.supply}</li>
            <li>Kalan: {left}{left > 0 && left < 5 ? " · Son biletler" : ""}</li>
            {meta.adult && <li>Yaş: 18+. Kimlik numarası istenmez.</li>}
          </ul>
          {meta.adult && account && proved && (
            <button
              className="ghost age-reset"
              type="button"
              onClick={() => {
                clearAgeProof(account);
                setProved(false);
              }}
            >
              Yaş kanıtını sıfırla
            </button>
          )}
        </div>
        <aside className="buybox">
          <p className="eyebrow">Bilet</p>
          <strong>{formatAvax(TICKET_PRICE)}</strong>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${filled}%` }} />
          </div>
          <p>
            {left > 0 && left < 5 ? "Son biletler. " : ""}
            {left} kontenjan kaldı. Tutar bakiyeden düşer, iade edilince geri yazılır.
          </p>
          {!account && !wallet && <MetaMaskLink wide />}
          {account && !onFuji && (
            <button className="solid wide" type="button" onClick={() => ensureFuji()}>
              Fuji ağına geç
            </button>
          )}
          {!account && wallet && (
            <button className="solid wide" type="button" onClick={() => connect(wallet, true)}>
              MetaMask ile bağlan
            </button>
          )}
          {account && onFuji && needsProof && (
            <button
              className="solid wide"
              type="button"
              onClick={() => {
                saveAgeProof(account);
                setProved(true);
              }}
            >
              Yaş kanıtı oluştur
            </button>
          )}
          {account && onFuji && !needsProof && (
            <button
              className="solid wide"
              type="button"
              disabled={!ready || busyId !== null || left === 0}
              onClick={take}
            >
              {left === 0
                ? "Tükendi"
                : busyId === index && awaitingWallet
                  ? "MetaMask’ta onayla"
                  : busyId === index
                    ? "Onay bekleniyor…"
                    : "Hemen bilet al"}
            </button>
          )}
          {busyId === index && awaitingWallet && (
            <button className="text-btn" type="button" onClick={cancelSign}>
              Vazgeç
            </button>
          )}
          {meta.adult && proved && <p>Yaş kanıtı hazır. Kimlik numarası yazılmadı.</p>}
          {meta.adult && !account && <p>18+ etkinlik. Biletten önce yaş kanıtı istenir. Kimlik numarası yok.</p>}
        </aside>
      </div>
    </article>
  );
}
