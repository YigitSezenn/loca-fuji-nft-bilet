export type EventMeta = {
  city: string;
  venue: string;
  category: string;
  blurb: string;
  tone: "fest" | "concert" | "theatre" | "sport" | "talk";
  image: string;
  adult?: boolean;
};

export function cover(src: string, kind: "card" | "hero" | "billboard" = "card") {
  const shade =
    kind === "billboard"
      ? "linear-gradient(90deg, rgba(12,6,2,.82) 0%, rgba(12,6,2,.28) 58%, rgba(12,6,2,.4) 100%)"
      : kind === "hero"
        ? "linear-gradient(180deg, rgba(12,6,2,.1) 20%, rgba(12,6,2,.72) 100%)"
        : "linear-gradient(180deg, rgba(12,6,2,.08) 25%, rgba(12,6,2,.78) 100%)";
  return {
    backgroundImage: `${shade}, url(${src})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export const eventMeta: EventMeta[] = [
  {
    city: "İstanbul",
    venue: "Maximum Uniq Açıkhava",
    category: "Festival",
    blurb: "Edis ve Sertab Erener. Bilet cüzdan adresine yazılır.",
    tone: "fest",
    image: "/posters/fest.jpg",
  },
  {
    city: "İstanbul",
    venue: "Ataköy Marina",
    category: "Konser",
    blurb: "Tek kayıt, tek sahip.",
    tone: "concert",
    image: "/posters/concert.jpg",
    adult: true,
  },
  {
    city: "Türkiye",
    venue: "Çeşitli mekanlar",
    category: "Tiyatro",
    blurb: "Tek perdelik oyun. Kayıt kişidedir.",
    tone: "theatre",
    image: "/posters/theatre.jpg",
  },
  {
    city: "İstanbul",
    venue: "Maximum Uniq Açıkhava",
    category: "Konser",
    blurb: "Kayıt cüzdan adresine yazılır.",
    tone: "talk",
    image: "/posters/standup.jpg",
  },
  {
    city: "Sakarya",
    venue: "Çeşitli mekanlar",
    category: "Festival",
    blurb: "Festival günleri. Bilet numarası kayıttır.",
    tone: "sport",
    image: "/posters/marathon.jpg",
  },
  {
    city: "İstanbul",
    venue: "Harbiye Cemil Topuzlu Açıkhava Tiyatrosu",
    category: "Konser",
    blurb: "Kayıt cüzdan adresine yazılır.",
    tone: "concert",
    image: "/posters/jazz.jpg",
    adult: true,
  },
  {
    city: "İstanbul",
    venue: "KüçükÇiftlik Park",
    category: "Konser",
    blurb: "Tek gösterim. Kayıt adreste durur.",
    tone: "theatre",
    image: "/posters/cinema.jpg",
  },
  {
    city: "İstanbul",
    venue: "Zorlu PSM Turkcell Sahnesi",
    category: "Konser",
    blurb: "Yeni yıl konseri. Numara ile sorgulanır.",
    tone: "talk",
    image: "/posters/talk.jpg",
  },
];

export const NAV = ["Festival", "Konser", "Tiyatro"] as const;
export const CATS = ["Festival", "Konser", "Tiyatro"] as const;
export const CITIES = ["İstanbul", "Sakarya", "Türkiye"] as const;

const MONTH_NO: Record<string, number> = {
  Ocak: 1,
  Şubat: 2,
  Mart: 3,
  Nisan: 4,
  Mayıs: 5,
  Haziran: 6,
  Temmuz: 7,
  Ağustos: 8,
  Eylül: 9,
  Ekim: 10,
  Kasım: 11,
  Aralık: 12,
};

export function whenOrder(label: string) {
  const match = label.match(/^(\d+)\s+(\S+)\s+(\d+)/);
  if (!match) return 0;
  return Number(match[3]) * 10000 + (MONTH_NO[match[2]] ?? 0) * 100 + Number(match[1]);
}

export function metaFor(index: number): EventMeta {
  return (
    eventMeta[index] ?? {
      city: "İstanbul",
      venue: "Loca Sahnesi",
      category: "Etkinlik",
      blurb: "Kayıt cüzdan adresine yazılır.",
      tone: "fest",
      image: "/posters/fest.jpg",
    }
  );
}