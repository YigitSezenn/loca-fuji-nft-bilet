import { useState } from "react";
import { formatTicketNo } from "./ticketNo";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function CopyIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.2 8.2 6.4 11.4 12.8 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5.2" y="5.2" width="7.6" height="7.6" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.2 5.1V3.8A1.3 1.3 0 0 0 8.9 2.5H3.8A1.3 1.3 0 0 0 2.5 3.8v5.1A1.3 1.3 0 0 0 3.8 10.2H5.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);

  return (
    <button
      className={className ? `${className} copy-no` : "text-btn copy-no"}
      type="button"
      aria-label={done ? "Kopyalandı" : "Kopyala"}
      onClick={(event) => {
        event.stopPropagation();
        copyText(text).then((ok) => {
          if (!ok) return;
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      <CopyIcon done={done} />
    </button>
  );
}

export function CopyAddr({ address, className }: { address: string; className?: string }) {
  return <CopyButton text={address} className={className} />;
}

export default function CopyNo({ id }: { id: bigint | string }) {
  return <CopyButton text={formatTicketNo(id)} />;
}
