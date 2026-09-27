import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { metaFor } from "../eventMeta";
import CopyNo from "../CopyNo";
import TicketChain from "../TicketChain";
import { explain, lookupTicket } from "../session";
import { formatTicketNo, parseTicketNo } from "../ticketNo";

type Result = {
  no: string;
  name: string;
  whenLabel: string;
  owner: string;
  eventId: bigint;
};

export default function Query() {
  const [params, setParams] = useSearchParams();
  const [value, setValue] = useState(params.get("no") ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const run = useCallback(async (raw: string) => {
    const no = parseTicketNo(raw);
    if (!no) {
      setResult(null);
      setMissing(false);
      setError("Bilet numarası 10 haneli olmalı. Örnek: 4829-1033-71");
      return;
    }
    setPending(true);
    setMissing(false);
    setError("");
    try {
      const found = await lookupTicket(BigInt(no));
      if (!found) {
        setResult(null);
        setMissing(true);
        return;
      }
      setResult({ no, ...found });
    } catch (err) {
      setError(explain(err));
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    const no = params.get("no")?.trim() ?? "";
    if (no === "") return;
    setValue(no);
    void run(no);
  }, [params, run]);

  useEffect(() => {
    if (!missing && !error) return;
    const timer = window.setTimeout(() => {
      setMissing(false);
      setError("");
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [missing, error]);

  return (
    <div className="page">
      <section className="page-head">
        <p className="eyebrow">Sorgulama</p>
        <h1>Bilet numarasını yaz.</h1>
        <p>Numara profilindeki kayıttır. Sahip adresi Fuji’den okunur.</p>
      </section>
      <form
        className="query panel"
        onSubmit={(event) => {
          event.preventDefault();
          const no = parseTicketNo(value);
          if (!no) {
            void run(value);
            return;
          }
          if (params.get("no") === no) void run(no);
          else setParams({ no });
        }}
      >
        <input
          inputMode="numeric"
          placeholder="4829-1033-71"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button className="solid" type="submit" disabled={pending || value.trim() === ""}>
          {pending ? "Bakılıyor…" : "Sorgula"}
        </button>
      </form>
      {missing && <p className="toast bad">Bu numara kayıtlı değil.</p>}
      {error && <p className="toast bad">{error}</p>}
      {result && (
        <article className="stub result">
          <div>
            <p className="eyebrow">{metaFor(Number(result.eventId)).category}</p>
            <h2>{result.name}</h2>
            <p>{result.whenLabel}</p>
            <p>
              {metaFor(Number(result.eventId)).venue} · {metaFor(Number(result.eventId)).city}
            </p>
            <p className="owner">Sahip {result.owner}</p>
            <TicketChain id={BigInt(result.no)} />
          </div>
          <div className="stub-no">
            <span>Bilet no</span>
            <span className="no-row">
              <strong>{formatTicketNo(result.no)}</strong>
              <CopyNo id={result.no} />
            </span>
            <em>Geçerli</em>
          </div>
        </article>
      )}
    </div>
  );
}
