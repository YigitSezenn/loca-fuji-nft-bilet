from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ORANGE = RGBColor(0xE4, 0x57, 0x00)
INK = RGBColor(0xF4, 0xF4, 0xF5)
MUTED = RGBColor(0xC8, 0xC8, 0xC8)
BLACK = RGBColor(0x11, 0x11, 0x11)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

W = Inches(13.333)
H = Inches(7.5)

prs = Presentation()
prs.slide_width = W
prs.slide_height = H
BLANK = prs.slide_layouts[6]


def add_rect(slide, l, t, w, h, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape


def set_run(paragraph, text, size, color, bold=False):
    run = paragraph.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.name = "Calibri"
    return run


def add_text(slide, l, t, w, h, lines, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    for i, (text, size, color, bold) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(10)
        set_run(p, text, size, color, bold)
    return box


def upper_tr(text):
    return text.replace("i", "İ").upper()


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def base(slide):
    add_rect(slide, 0, 0, W, H, BLACK)
    add_rect(slide, 0, 0, Inches(0.18), H, ORANGE)


def slide_cover(title, line, sub, spoken):
    s = prs.slides.add_slide(BLANK)
    base(s)
    add_text(s, Inches(0.9), Inches(2.0), Inches(11), Inches(1.3), [(title, 72, WHITE, True)])
    add_rect(s, Inches(0.95), Inches(3.35), Inches(1.6), Inches(0.05), ORANGE)
    add_text(
        s,
        Inches(0.9),
        Inches(3.7),
        Inches(10.5),
        Inches(1.8),
        [(line, 30, ORANGE, False), (sub, 22, MUTED, False)],
    )
    notes(s, spoken)


def slide_body(kicker, title, bullets, spoken):
    s = prs.slides.add_slide(BLANK)
    base(s)
    add_text(s, Inches(0.9), Inches(0.5), Inches(11), Inches(0.4), [(upper_tr(kicker), 14, ORANGE, True)])
    add_text(s, Inches(0.9), Inches(0.95), Inches(11.5), Inches(1.1), [(title, 40, WHITE, True)])
    add_rect(s, Inches(0.95), Inches(2.15), Inches(1.6), Inches(0.05), ORANGE)
    add_text(
        s,
        Inches(0.9),
        Inches(2.6),
        Inches(11.5),
        Inches(4.2),
        [(b, 24, INK, False) for b in bullets],
    )
    notes(s, spoken)


def slide_close(title, line, bullets, spoken):
    s = prs.slides.add_slide(BLANK)
    base(s)
    add_text(s, Inches(0.9), Inches(1.7), Inches(11.5), Inches(1.4), [(title, 44, WHITE, True)])
    add_text(s, Inches(0.9), Inches(3.0), Inches(11), Inches(0.9), [(line, 28, ORANGE, False)])
    add_text(
        s,
        Inches(0.9),
        Inches(4.1),
        Inches(11.5),
        Inches(2.4),
        [(b, 22, MUTED, False) for b in bullets],
    )
    notes(s, spoken)


slide_cover(
    "loca",
    "Bilet, cüzdanındaki kayıttır.",
    "Biletix düzeninde arayüz. Avalanche Fuji’de mülkiyet.",
    "Bir konser bileti aldığınızda elinizde ne var? Bir PDF, bir QR, bir ekran görüntüsü. "
    "Hepsi kopyalanabilir, hepsi bir şirketin veritabanındaki satıra bağlı. "
    "Loca bu satırı zincire taşıyor. Arayüz Biletix kadar tanıdık: afişler, şehir ve kategori filtreleri, arama. "
    "Altında ise şu var: bilet, cüzdan adresinize yazılmış bir kayıt. "
    "Ödemeyi sözleşme alıyor, iadeyi sözleşme yapıyor, aradan komisyon kesen bir katman yok. "
    "Kullanıcı Web3 öğrenmek zorunda değil. Sadece bir kez onay veriyor. Bugün size hem ürünü hem de altındaki mimariyi göstereceğim.",
)

slide_body(
    "Temel mekanizma",
    "Üç adımda bilet.",
    [
        "1  Etkinliği aç. Kalan kontenjan zincirden okunur.",
        "2  MetaMask’ta 0,0002 AVAX’lık tek onay.",
        "3  Sözleşme bileti adrese yazar, 10 haneli numara doğar.",
        "İade: tutar bakiyeye, kontenjan etkinliğe geri döner.",
    ],
    "Akış kasıtlı olarak üç adım. Etkinliği açıyorsunuz, kalan kontenjanı doğrudan sözleşmeden okuyoruz. "
    "Tek bir düğmeye basıyorsunuz, MetaMask tek bir onay istiyor. Gizli ikinci imza, ayrı bir onay adımı, token izni yok. "
    "Sözleşmedeki claim fonksiyonu payable ve gönderilen tutarın tam olarak 0,0002 AVAX olmasını şart koşuyor; "
    "bir wei eksik ya da fazla gelirse işlem geri dönüyor. "
    "Bilet numarası rastgele değil, belirlenebilir biçimde üretiliyor: blok zamanı, alıcının adresi, etkinlik kimliği ve o ana kadar "
    "basılmış toplam bilet sayısı keccak’tan geçiyor, sonuç bir ile on milyar arasına indiriliyor. Böylece her numara on haneli oluyor. "
    "Aynı numara daha önce üretilmişse sözleşme bir sonraki boş numaraya geçiyor, yani çakışma imkânsız. "
    "Ekranda numarayı 0000-0000-00 biçiminde gösteriyoruz; kapıda okunabilir, telefonda okunabilir. "
    "İade tarafında da tek adım var: tutar aynı sözleşmeden geri geliyor, kontenjan aynı saniyede yeniden açılıyor.",
)

slide_body(
    "Mimari",
    "İnce yığın, sağlam zemin.",
    [
        "Solidity 0.8.24 · Hardhat · 10 test, tamamı geçiyor.",
        "React 19 · TypeScript · viem 2 · Vite. Tek oturum bağlamı.",
        "Fuji’de Multicall3 yok: üç RPC’li fallback kurduk.",
        "6 sn zaman aşımı, sıralama kapalı, çakışmayan yoklama.",
    ],
    "Yığını bilinçli olarak ince tuttuk. Sözleşme tarafında Solidity 0.8.24 ve Hardhat; on testimiz var ve hepsi geçiyor. "
    "Testler yalnız mutlu yolu değil, reddedilmesi gereken durumları da doğruluyor: eksik tutar, dolu kontenjan, "
    "başkasının biletini iade etme denemesi. "
    "Ön yüzde React 19, TypeScript ve viem 2 var; tüm zincir durumu tek bir oturum bağlamında toplanıyor, "
    "yani bakiye, kontenjan ve bilet listesi tek kaynaktan besleniyor. "
    "Burada gerçek bir mühendislik kararı almamız gerekti. Fuji ağında Multicall3 dağıtılmış değil. "
    "Bu, sekiz etkinliği tek çağrıda toplu okuyamayacağımız anlamına geliyordu. "
    "Kütüphanenin varsayılan davranışı bu durumda hata veriyordu; biz okumaları tek tek yapan ve üç ayrı RPC arasında "
    "otomatik geçiş yapan bir fallback kurduk: publicnode, Avalanche’ın resmi uç noktası ve drpc. "
    "Her birine altı saniye zaman aşımı koyduk, yeniden deneme sayısını sıfırladık ve uç noktaları hıza göre sıralama özelliğini kapattık; "
    "çünkü sıralama açıkken süreç ilk yavaş yanıtta kilitleniyordu. "
    "Sonuç şu: resmi RPC yavaşladığında site durmuyor, sıradakine geçiyor ve kullanıcıya tek bir sade satır yazıyor: "
    "ağ yavaş yanıt verdi, birazdan yeniden denenecek. Ham hata metni, uç nokta adresi, yığın izi kullanıcıya asla gösterilmiyor.",
)

slide_body(
    "Sözleşme ve güvenlik",
    "Kontenjan sözleşmede. Bilet devredilebilir.",
    [
        "Kontenjan zincirde tutulur: fazla satış matematiksel olarak imkânsız.",
        "Bir cüzdan, bir etkinlik, bir bilet.",
        "Bilet bir Loca NFT’sidir. Başka adrese devredilir.",
        "İade yalnız sahibine açık; liste swap-pop ile boşluksuz kalır.",
    ],
    "Güvenliği üç cümlede özetleyebilirim. "
    "Birincisi, kontenjan sunucuda değil sözleşmede. Her etkinliğin arzı ve basılmış bilet sayısı zincirde duruyor; "
    "basılan sayı arza eşitlenince sözleşme işlemi geri çeviriyor. Aynı saniyede yüz kişi son bileti istese bile, "
    "blok sırası kimin aldığını belirliyor ve geri kalan işlemler geri dönüyor. Fazla satış bir politika değil, bir imkânsızlık. "
    "İkincisi, bir cüzdan bir etkinliğe yalnız bir bilet alabiliyor. Bunu bir eşleme ile tutuyoruz; ikinci deneme daha zincire "
    "para harcamadan reddediliyor. Bu, tek bir cüzdanın stok kapatmasını engelliyor. "
    "Üçüncüsü: bilet bir ERC-721 tokenıdır. Adı Loca, sembolü LOCA. "
    "transferFrom ile başka bir cüzdana gider. Alan cüzdanın o etkinlikte bileti varsa sözleşme geri çevirir. "
    "Sitede ilan panosu yok. İkinci el, biletin devredilmesiyle mümkündür. "
    "İade tokenı yakar ve tutarı sahibine yollar. "
    "İade tarafında bilet sahibi kontrolü sözleşmede; başkası çağırırsa geri dönüyor. "
    "Sahibin bilet listesini temizlerken swap-pop kullanıyoruz: iade edilen numaranın yerine listenin son elemanını koyup listeyi kısaltıyoruz. "
    "Bu, listeyi kaydırmaya göre sabit maliyetli; kullanıcının otuz bileti de olsa iade gazı büyümüyor ve dizide boşluk kalmıyor. "
    "Durum güncellemeleri parayı göndermeden önce yapılıyor, yani yeniden giriş için bir pencere bırakmıyoruz.",
)

slide_body(
    "Kullanıcı deneyimi",
    "Web3 hızlı hissettirmeli.",
    [
        "İyimser güncelleme: kontenjan ve bakiye tıklamada değişir.",
        "Kelepçe: geciken RPC yanıtı eski sayıyı geri getiremez.",
        "Hata 4902: ağ yoksa Fuji cüzdana otomatik eklenir.",
        "Her mesaj gerçek zincir sonucu. Sahte onay yok.",
    ],
    "Web3 ürünlerinin çoğunda hissettiğiniz hantallık teknik bir zorunluluk değil, arayüz tercihi. Biz üç yerde müdahale ettik. "
    "Birincisi iyimser güncelleme. İşlem zincire gittiği anda kalan kontenjanı bir düşürüyor, bakiyeyi bilet tutarı kadar azaltıyoruz. "
    "Kullanıcı onay beklerken donmuş bir ekrana bakmıyor. "
    "Ama iyimser güncellemenin klasik bir tuzağı var: arkada dönen yoklama, henüz güncellenmemiş bir RPC’den eski sayıyı okuyup "
    "ekranı geri alabilir. Kullanıcı kontenjanın düştüğünü görür, iki saniye sonra eski sayıya dönmesini izler. Güven biter. "
    "Bunun için bir kelepçe mantığı yazdık: alışta o etkinlik için bir taban, iadede bir tavan tutuyoruz. "
    "Gecikmiş bir yanıt bu sınırın dışına çıkarsa yok sayılıyor. Ayrıca her okuma turuna bir üretim numarası veriyoruz; "
    "yolda kalan eski bir istek döndüğünde numarası eşleşmediği için sessizce atılıyor. "
    "İşlem başarısız olursa kelepçeyi kaldırıp gerçeği yeniden okuyoruz, yani ekran asla yalan söylemiyor. "
    "İkincisi ağ kurulumu. Kullanıcı Fuji ağını elle eklemek zorunda değil. Ağ değiştirme isteği 4902 hatasıyla dönerse, "
    "yani cüzdanda o ağ tanımlı değilse, zincir numarasını, RPC adresini ve gezgin adresini biz gönderip ağı ekletiyoruz. "
    "Kullanıcı ayarlara girmiyor. "
    "Üçüncüsü ve en ince detay: cüzdan isteğini tıklama turunda, hiçbir bekleme yapmadan gönderiyoruz. "
    "Önce veri okursanız Edge tarayıcısı MetaMask’ı yan panel yerine tam sekme olarak açıyor ve akış bozuluyor. "
    "Bunu yaşadık ve isteği en başa çekerek çözdük. "
    "Son olarak ekrandaki her mesaj gerçek bir zincir sonucudur. Makbuz başarılı değilse başarılı yazmıyoruz. "
    "Kullanıcı vazgeçerse işlem gönderilmedi diyoruz. Alıştan sonra iade düğmesini otuz saniye kapalı tutuyoruz; "
    "bunu şeffaf söylüyorum, bu bir arayüz koruması, çünkü yeni bilet numarası zincirde kesinleşmeden yapılan iade denemesi hata üretiyordu.",
)

slide_body(
    "İnovasyon vizyonu",
    "Yaşı doğrula, kimliği saklamadan.",
    [
        "18+ etkinlikte kimlik numarası ne siteye ne zincire yazılır.",
        "Güvenilen kurum “bu adres 18 yaşından büyük” diye imzalar.",
        "Sözleşme imzaya bakar, kimliğe bakmaz.",
        "Bugün: iki konserde çalışan arayüz, yer tutucu kanıt.",
    ],
    "Şimdi projenin beni en çok heyecanlandıran tarafına geliyorum. 18 yaş sınırlı etkinlikler. "
    "Bugün Türkiye’de bunun yolu kimlik numarasını bir siteye yazmaktan geçiyor. Bu veri bir yerde duruyor, bir gün sızıyor. "
    "Şifreleyerek çözülmez, çünkü iki ihtimal var: mekân şifreyi çözemiyorsa doğrulama yapamaz, çözebiliyorsa numarayı görür. "
    "Doğru çözüm numarayı taşımamak. Güvenilen bir kurum kimliği bir kez görür ve şunu imzalar: bu cüzdan adresi 18 yaşından büyük birine ait. "
    "Tek bir cümle, tek bir imza. Bilet alırken sözleşme bu imzayı doğrular. Kimlik numarası ne sitede, ne veritabanında, ne zincirde durur. "
    "Sızacak veri yoktur, çünkü veri hiç toplanmamıştır. "
    "Şeffaf olmak istiyorum: bugün elimizde bu akışın arayüzü var. Amr Diab ve Duman konserlerinde bilet almadan önce bir yaş kanıtı adımı çıkıyor, "
    "ve dikkat edin, hiçbir yerde kimlik alanı yok. Ancak bugünkü kanıt tarayıcıda duran bir yer tutucu; sözleşme henüz imzayı doğrulamıyor. "
    "Bunu bir başarı gibi sunmuyorum, yol haritasının bir sonraki adımı olarak sunuyorum. "
    "Mimari bunu almaya hazır: doğrulama claim fonksiyonuna eklenecek tek bir şart.",
)

slide_body(
    "Canlı demo",
    "Şimdi zincirde görelim.",
    [
        "Hep Yeni Kal Fest · Maximum Uniq Açıkhava · 120 kontenjan.",
        "Cüzdanı bağla, Fuji bakiyesini göster.",
        "Bilet al: kontenjan 119, bakiye 0,0002 AVAX azalır.",
        "Numarayı sorgula: sahip adres, bağlı cüzdanla aynı.",
    ],
    "Demo sırasını bozmayın. Hep Yeni Kal Fest’i açın; Maximum Uniq Açıkhava, iki Ekim, yüz yirmi kontenjan. "
    "Bu etkinlik 18+ değil, yani akış tek onayda tamamlanır. "
    "Önce kontenjanı ve bakiyeyi yüksek sesle söyleyin, sonra bileti alın. "
    "Jüri iki şeyi aynı anda görecek: kalan sayının yüz on dokuza düşmesi ve bakiyenin tam 0,0002 AVAX azalması. "
    "Gaz farkı görünmeyecek, çünkü Fuji’de gaz fiyatı altı basamaklı gösterimin altında kalıyor; yani ekrandaki düşüş biletin kendisidir. "
    "Sonra bilet numarasını Sorgula sayfasına girin. Dönen sahip adresi, sağ üstte bağlı olan cüzdanla birebir aynı olacak. "
    "Bu, sunumun kanıt anıdır: bileti site söylemiyor, zincir söylüyor. "
    "Vakit kalırsa Biletlerim’e geçin. İade düğmesi otuz saniye boyunca geri sayım gösterir; süre dolunca iade edin ve "
    "kontenjanın yüz yirmiye, bakiyenin eski değerine döndüğünü gösterin. "
    "MetaMask sıfır dolar yazarsa hiç durmayın, hemen açıklayın: o rakam dolar karşılığıdır, Fuji test AVAX’ının piyasa fiyatı yoktur. "
    "Sitedeki AVAX bakiyesi zincirden okunan gerçek tutardır. "
    "Ağ o an yavaşsa sakin kalın, arayüz zaten yeniden deneyeceğini yazıyor ve yedek RPC devreye giriyor.",
)

slide_close(
    "Bilet, ekran görüntüsü değil.",
    "Fuji’de o adrese yazılmış kayıttır.",
    [
        "Bugün çalışan: ödeme, mülkiyet, iade, sorgulama. Tek onayla.",
        "Sırada: imzalı yaş kanıtının sözleşmeye eklenmesi.",
        "Sırada: organizatör payı ve hasılat çekimi.",
        "Sorularınızı almaya hazırım.",
    ],
    "Kapatırken tek bir cümle bırakmak istiyorum: ekran görüntüsü bilet değildir. Bilet, Fuji’de o adrese yazılmış kayıttır. "
    "Bugün çalışan kısım eksiksiz bir döngü: ödeme, mülkiyet, iade ve bağımsız sorgulama, hepsi tek onayla ve gerçek bir ağ üzerinde. "
    "Sırada iki şey var. Yaş kanıtının sözleşme tarafında doğrulanması ve organizatör payı ile hasılat çekimi. "
    "İkincisini özellikle söylüyorum, çünkü bugünkü sözleşmede para çekme fonksiyonu yok; bilet bedeli iade için sözleşmede bekliyor. "
    "Bu bir eksiklik değil, bilinçli bir kapsam kararı: ilk sürümde kullanıcının parasını geri alabileceğinden emin olmak istedik. "
    "Şimdi sorularınızı alabilirim. "
    "Hazır cevaplar: Yoğunlukta çöker mi? Arz sözleşmede tutulduğu için fazla satış imkânsız; yarış durumunu blok sırası çözüyor ve "
    "kaybeden işlemler geri dönüyor. Okuma tarafında üç RPC’li fallback ve çakışmayan yoklama var. Yük testi yapmadık, bunu iddia etmiyorum. "
    "Karaborsa nasıl işler? Bilet NFT’dir, sahibi başka adrese devreder. Sitede satış ilanı yoktur. Bir cüzdan bir etkinliğe bir bilet alabilir. "
    "Neden ana ağ değil? Fuji test ağı; ürün kararı değil, sorumluluk kararı. Ana ağ için gereken tek şey yeni bir dağıtım. "
    "Neden 0,0002 AVAX? Test cüzdanının bakiyesi küçük; fiyat sözleşmede sabit ve tek satırla değişir. "
    "Kullanıcı cüzdanını kaybederse? Bugün bilet o adrese bağlı, kurtarma yok. Dürüst cevap bu; kurtarma ancak imzalı kimlik kanıtıyla anlamlı olur.",
)

out = "/Users/yigit/Desktop/Tribun-Sunum.pptx"
prs.save(out)
print(out)
