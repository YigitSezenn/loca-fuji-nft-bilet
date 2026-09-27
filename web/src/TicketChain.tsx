import { useEffect, useState } from "react";
import { fujiTicketUrl, fujiTxUrl, ticketTrail, trailLabel, type TrailStep } from "./session";

export default function TicketChain({ id }: { id: bigint }) {
  const [steps, setSteps] = useState<TrailStep[] | null>(null);
  const href = fujiTicketUrl(id);

  useEffect(() => {
    let stop = false;
    ticketTrail(id)
      .then((rows) => {
        if (!stop) setSteps(rows);
      })
      .catch(() => {
        if (!stop) setSteps([]);
      });
    return () => {
      stop = true;
    };
  }, [id]);

  return (
    <div className="chain-note">
      <p>Bu bilet bir Loca NFT’sidir.</p>
      {steps && steps.length > 0 && (
        <ol>
          {steps.map((step, index) => (
            <li key={`${step.hash}-${index}`}>
              <span>{trailLabel(step)}</span>
              <a href={fujiTxUrl(step.hash)} target="_blank" rel="noreferrer">
                İşlem
              </a>
            </li>
          ))}
        </ol>
      )}
      {href && (
        <a href={href} target="_blank" rel="noreferrer">
          Fuji’de gör
        </a>
      )}
    </div>
  );
}
