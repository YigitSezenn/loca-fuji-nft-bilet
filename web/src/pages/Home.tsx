import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cover, metaFor } from "../eventMeta";
import { TICKET_PRICE } from "../price";
import { formatAvax, useSession } from "../session";

function fold(value: string) {
  return value.toLocaleLowerCase("tr").replaceAll("ı", "i");
}

function shortDate(when: string) {
  const match = when.match(/^(\d+)\s+(\S+)/);
  if (!match) return when;
  const months: Record<string, string> = { Ekim: "Eki", Kasım: "Kas" };
  return `${match[1]} ${months[match[2]] ?? match[2].slice(0, 3)}`;
}

export default function Home() {
  const { events } = useSession();
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const city = params.get("sehir") ?? "";
  const month = params.get("ay") ?? "";
  const cat = params.get("kat") ?? "";
  const filtering = Boolean(q || city || month || cat);
  const [slide, setSlide] = useState(0);

  const list = useMemo(() => {
    return events
      .map((event, index) => ({ event, index, meta: metaFor(index) }))
      .filter(({ event, meta }) => {
        if (city && meta.city !== city) return false;
        if (cat && meta.category !== cat) return false;
        if (month) {
          const sameDay = event.whenLabel === month;
          const sameMonth = !/^\d/.test(month) && event.whenLabel.includes(month);
          if (!sameDay && !sameMonth) return false;
        }
        if (!q) return true;
        const hay = fold(`${event.name} ${event.whenLabel} ${meta.city} ${meta.venue} ${meta.category}`);
        return hay.includes(fold(q));
      });
  }, [events, q, city, month, cat]);

  useEffect(() => {
    if (events.length === 0 || filtering) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % events.length), 7000);
    return () => window.clearInterval(timer);
  }, [events.length, filtering]);

  const heroIndex = events.length === 0 ? 0 : slide % events.length;
  const hero = events[heroIndex];
  const heroMeta = metaFor(heroIndex);

  function move(step: number) {
    if (events.length === 0) return;
    setSlide((current) => (current + step + events.length) % events.length);
  }

  return (
    <>
      {!filtering && hero && (
        <section className="billboard" aria-roledescription="carousel">
          <div key={heroIndex} className="billboard-bg" style={cover(heroMeta.image, "billboard")} />
          <button className="billboard-nav prev" type="button" aria-label="Önceki afiş" onClick={() => move(-1)}>
            ‹
          </button>
          <Link className="billboard-copy" key={heroIndex} to={`/etkinlik/${heroIndex}`}>
            <p>{heroMeta.category}</p>
            <h1>{hero.name}</h1>
            <span>
              {heroMeta.venue} · {heroMeta.city}
            </span>
            <span>{hero.whenLabel}</span>
            <span>
              {hero.supply - hero.issued > 0 && hero.supply - hero.issued < 5 ? "Son biletler. " : ""}
              {hero.supply - hero.issued} kontenjan kaldı
            </span>
            <em>Hemen bilet al</em>
          </Link>
          <button className="billboard-nav next" type="button" aria-label="Sonraki afiş" onClick={() => move(1)}>
            ›
          </button>
        </section>
      )}
      <div className="page">
        <div className="section-head" id="liste">
          <h2>{filtering ? "Arama sonuçları" : "Yaklaşan etkinlikler"}</h2>
          <span>{events.length === 0 ? "" : `${list.length} etkinlik`}</span>
        </div>
        {events.length === 0 && (
          <div className="cards">
            {[0, 1, 2, 3].map((item) => (
              <div className="skeleton card-skel" key={item} />
            ))}
          </div>
        )}
        {events.length > 0 && list.length === 0 && (
          <p className="empty">Bu aramaya uygun etkinlik yok.</p>
        )}
        <div className="cards" key={`${q}|${city}|${month}|${cat}`}>
          {list.map(({ event, index, meta }) => {
            const left = event.supply - event.issued;
            return (
              <Link className="card" key={`${event.name}-${index}`} to={`/etkinlik/${index}`}>
                <div className="poster" style={cover(meta.image)}>
                  <div className="poster-top">
                    <span className="badge">{shortDate(event.whenLabel)}</span>
                    <span className="poster-flags">
                      {left > 0 && left < 5 && <span className="last">Son biletler</span>}
                      {meta.adult && <span className="adult">18+</span>}
                    </span>
                  </div>
                  <strong>{meta.category}</strong>
                  <em>{left} kaldı</em>
                </div>
                <h3>{event.name}</h3>
                <p>
                  {meta.venue}, {meta.city}
                </p>
                <p>{event.whenLabel}</p>
                <b>{formatAvax(TICKET_PRICE)}</b>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
