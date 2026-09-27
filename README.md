# Loca

Avalanche Fuji hackathon, Team 1 projesi. Bilet sitesi. Etkinliği seçersin, MetaMask ile 0,0002 AVAX ödersin, bilet cüzdan adresine yazılır. İade edilince aynı tutar geri gelir. Kayıt Avalanche Fuji test ağındadır. Site yerelde kalır.

## Localde çalıştırma

Site yalnızca bu bilgisayarda açılır. Adres `127.0.0.1`. Dışarıya tünel açılmaz, herkese açık bir adres yoktur.

Bilgisayarda Node.js kurulu olmalı. Siteyi Edge’de aç. MetaMask eklentisi aynı tarayıcıda olmalı. Telefondaki MetaMask, `127.0.0.1` adresini göremez.

Masaüstündeki `tribun` klasöründen:

```bash
cd /Users/yigit/Desktop/tribun/web
npm install
npm run dev
```

`npm install` bir kez yeter. `web/.env` yoksa `web/.env.example` dosyasını `web/.env` olarak kopyala. Adres hazırdır. Sonraki açılışlarda yalnızca `npm run dev`.

Terminalde `Local: http://127.0.0.1:5173/` yazınca tarayıcıda şu adresi aç:

http://127.0.0.1:5173/

Kapatmak için o terminalde `Ctrl+C`. Sunucu durunca sayfa açılmaz. Yeniden açmak için aynı klasörde tekrar `npm run dev`.

MetaMask ağı Avalanche Fuji C-Chain olmalı. Zincir numarası 43113. Sitedeki bakiye Fuji AVAX’tır. MetaMask’ın büyük yazdığı 0 dolar, test AVAX’ın dolar fiyatının olmamasıdır. Para yok demek değildir.

## Sözleşme

Adres `web/.env` dosyasındadır. Site bu adresi okur. Yeni bir sözleşme dağıtmana gerek yok.

Şu anki kayıt:

`0x7232709C7947106f4e58a6fab83d107B1d3b0567`

https://testnet.snowtrace.io/address/0x7232709C7947106f4e58a6fab83d107B1d3b0567

`contract/.env` içindeki anahtar yalnızca dağıtım içindir. Paylaşma, sunuma koyma, depoya ekleme.

## Sayfalar

- `/` etkinlikler
- `/etkinlik/0` bir etkinliğin bileti
- `/profil` cüzdanındaki biletler, iade ve devir
- `/sorgula` 10 haneli numara

Bilet bir Loca NFT’sidir. Her biletin tek numarası vardır. Ekranda `0000-0000-00` biçimindedir. Aynı cüzdan bir etkinliğe bir kez bilet alır. İade ve devir, alıştan 30 saniye sonra açılır. İade, tutarı bakiyeye ve kontenjanı etkinliğe döner. Başka adrese devredilen bilet iade edilmez. Sitede satış panosu yoktur. Devret, bileti başka bir `0x` adresine geçirir.

Hesap değiştir, bağlı cüzdanın hesaplarını listeler. Biletler ve bakiye seçilen adrese göre gelir. Cüzdan adresi ve bilet numarası ikonla kopyalanır. Kopyalanan adres tam `0x` adresidir.

## Etkinlikler

İsim ve tarih sözleşmede. Mekan sitede. Afişler Biletix görseli değildir.

- Hep Yeni Kal Fest — 2 Ekim 2026 — Maximum Uniq Açıkhava, İstanbul
- Amr Diab — 3 Ekim 2026 — Ataköy Marina, İstanbul — 18+
- Sakarya Festivali — 8 Ekim 2026 — çeşitli mekanlar, Sakarya
- Yann Tiersen — 10 Ekim 2026 — Maximum Uniq Açıkhava, İstanbul
- Sertab Erener — 16 Ekim 2026 — KüçükÇiftlik Park, İstanbul
- Bir Baba Hamlet — 20 Ekim 2026 — çeşitli mekanlar
- Duman — 28 Ekim 2026 — Harbiye Cemil Topuzlu Açıkhava Tiyatrosu, İstanbul — 18+
- Mario Frangoulis — 7 Ocak 2027 — Zorlu PSM Turkcell Sahnesi, İstanbul

18+ etkinlikte “Yaş kanıtı oluştur” düğmesi kimlik numarası istemez. Bu düğme tarayıcıda durur. Sözleşme henüz kanıta bakmaz.
