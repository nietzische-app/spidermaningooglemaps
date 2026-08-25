# Three.js × Google Photorealistic 3D Tiles — Web Swinging

Google'ın **Photorealistic 3D Tiles** karoları üzerinde koşan, zıplayan ve
gerçek binalara ağ atıp sarkaç gibi sallanan bir 3. şahıs karakter kontrolcüsü.
[Three.js](https://threejs.org/) ile render edilir.

## Kontroller

| Girdi | Hareket |
| --- | --- |
| **Tuvale tıkla** | Fare imlecini kilitle (oyuna gir) |
| **Fare** | Kamerayı karakterin etrafında 360° döndür |
| **W A S D** | Koş (kamera yönüne göre) |
| **Shift** | Hızlan |
| **Space** | Zıpla |
| **Sol tık (basılı tut)** | Nişangahtaki noktaya ağ at ve sallan |
| **Sol tık (bırak)** | Ağı kop, kazanılan momentumla fırla |
| **W (sallanırken)** | Salınımı pompala (ivme kazan) |
| **R** | Zemine geri dön (gömülürsen) |
| **Esc** | İmleci serbest bırak |

## Prova şehri — kota harcamadan geliştirme

```
?mock=1
```

API anahtarı olmadan (ya da `?mock=1` ile) prosedürel bir kutu-şehir yüklenir.
Tüm mekanikler aynı kodla çalışır. **Fizik ayarı yaparken bunu kullanın** —
Photorealistic 3D Tiles kullanım başına faturalanır ve tarayıcıda saatlerce
uçmak gerçek para harcar.

## Nasıl çalışıyor?

### Yerel koordinat sistemi

Google karoları **ECEF** koordinatlarında gelir: dünya merkezinden ~6.3 milyon
metre uzakta, "yukarı" yönü her noktada farklı. Bu uzayda fizik yazmak hem
yerçekimini her kare yeniden hesaplamayı gerektirir hem de `float32` hassasiyeti
o mesafelerde metre altına düşer.

Çözüm `ReorientationPlugin`: seçilen enlem/boylamı sahnenin **orijinine** taşır
ve **+Y'yi yukarı** çevirir. Böylece karakter sıradan bir yerel oyun uzayında
yaşar — yerçekimi `(0, -g, 0)`, koordinatlar küçük. Şehir ölçeğinde (birkaç km)
dünyanın eğriliği önemsiz.

### Çarpışma

Karolar akış hâlinde gelen üçgen yığını olduğu için ışın tabanlı çarpışma
kullanılıyor (`TilesRenderer.accelerateRaycast` sayesinde ışınlar karo
hiyerarşisinde hızlandırılır):

- **Dikey ve yatay ayrı çözülür** — zeminde sürünürken takılmayı önler.
- **Süpürme (sweep)** ışını hareket yönüne atılır; yüksek hızda duvarın
  içinden geçmeyi (tunneling) engeller.
- **Alt adımlama**: her karede en fazla yarıçapın yarısı kadar yol alınır.
- Yüzeye giren hız bileşeni silinir → duvar boyunca kayma.

### Sarkaç fiziği

Konum tabanlı (PBD) ip kısıtı: karakter ipin izin verdiği küresel yüzeyin
dışına çıkarsa geri çekilir ve **çapadan uzaklaşan radyal hız bileşeni silinir**.
Geriye kalan teğetsel hız salınımı oluşturur — enerji korunur, alçalırken
hızlanır, yükselirken yavaşlar.

Ölçülen davranış (60 m ip, açık havada): ip uzunluğu sapması `0.00`, hız uç
noktada `0.1 m/s`'ye düşüp dip noktada tekrar yükseliyor.

## Kurulum

```bash
npm install
cp .env.example .env      # VITE_GOOGLE_MAPS_API_KEY=...
npm run dev
```

Anahtar için Google Cloud'da **Map Tiles API**'yi etkinleştirin. Anahtar
tarayıcı paketine gömülür; Cloud Console'dan **HTTP referrer** kısıtı koyun ve
**kota tavanı** tanımlayın.

## Ağ neden takılmıyor? — nişangah göstergesi

Nişangah, o an bakılan noktanın ağ atmaya uygun olup olmadığını renkle söyler
ve HUD'da sayısal karşılığını yazar:

| Renk | Anlam |
| --- | --- |
| Beyaz | Menzilde (`maxRange`, 160 m) yüzey yok |
| Sarı | Yüzey var ama karakterden 3 m'den az yukarıda — sarkaç kurulamaz |
| Yeşil | Ağ atılabilir |
| Kırmızı | Ağ takılı, sallanıyorsun |

Sarı en sık görülen durumdur: **çatıda duruyorsanız** çevrenizde daha yüksek
bir yapı olmayabilir. Sarkaç için çapanın belirgin şekilde yukarıda olması
gerekir, yoksa kendinizi zemine çekersiniz.

Havadan başlayıp doğrudan sallanmayı denemek için:

```
?yukseklik=150            # zeminin 150 m üstünde başla
?konum=newyork&yukseklik=200   # Manhattan — sallanmak için en uygun geometri
```

## Detay seviyesi (LOD) — binaların 3D görünmesi

```
?detay=5     # varsayılan, sokak seviyesi
?detay=2     # daha keskin, belirgin şekilde daha çok istek
?detay=20    # kuş bakışı için yeterli, sokakta bulanık düz levha
```

`errorTarget`, ekran-uzayı hata eşiğidir (piksel): bir karo, izdüşen geometrik
hatası bu değeri aştığında bir alt seviyeye bölünür. **Küçük değer = daha çok
detay = daha çok karo isteği = daha çok fatura.**

`GoogleCloudAuthPlugin`, `useRecommendedSettings` varsayılan açıkken bunu
sessizce **20** yapar. Şehrin üstünde uçmak için makul, ama sokak seviyesinde
binalar hiç ayrışmaz: harita bulanık düz bir levha olarak kalır ve ağ atacak
geometri oluşmaz. Bu yüzden seçenek kapatılıp değer `src/config.js`'te
açıkça belirleniyor.

Detayı artırmadan önce Cloud Console'da **kota tavanınızın** ayarlı olduğundan
emin olun.

## Başlangıç konumu

```
?konum=levent | maslak | galata | newyork | paris | tokyo
?lat=41.0820&lon=29.0090
```

Varsayılan **Levent**'tir (İş Kuleleri çevresi).

Doğuş noktası koordinata sabitlenmez. Karolar yüklendikten sonra `findSwingSpawn()`
çevrede 520 m karelik alanı 169 noktada tarar ve **etrafında en çok yüksek yapı
bulunan alçak noktayı** seçer — yani kuleler arasındaki sokağı. Bu, iki kırılgan
durumu birden ortadan kaldırır:

- Verilen koordinat bir gökdelenin tam tepesine denk gelirse (Galata Kulesi
  durumu) karakter en yüksek noktada doğar ve ağ atacak hiçbir hedef bulamaz.
- Koordinat birkaç yüz metre şaşarsa alçak bir mahalleye iner.

**T** raporu, seçilen noktada çapa bulunup bulunmadığını ayrıca yazar.

## Dosyalar

```
src/main.js       Bootstrap, oyun döngüsü, spawn
src/world.js      Karolar + reorientation, prova şehri, ışın sorguları
src/player.js     Karakter fiziği, çarpışma çözümü
src/swing.js      Ağ atma, ip kısıtı, sarkaç
src/cameraRig.js  3. şahıs kamera (yaw/pitch, duvar geçirmez)
src/input.js      Klavye + pointer lock
src/hud.js        Nişangah, telemetri, telif satırı
src/config.js     Tüm fizik/kamera ayarları
```

Fiziği `src/config.js`'ten ayarlayın — yerçekimi gerçeğin ~2.5 katı
(`gravity: 26`), aksi hâlde sarkaç ağır çekim gibi duruyor.

## 403 aldığınızda

Uygulama artık Google'ın **gerçek hata mesajını** ekranda gösterir ve ne
yapılacağını söyler — DevTools açmanız gerekmez.

Bunun neden fetch seviyesinde yapıldığı önemli: ilk hata karo isteğinde değil,
**oturum anahtarı isteğinde** oluşur. `GoogleCloudAuth.refreshToken()` içindeki
o fetch, yanıt gövdesini okumadan doğrudan `Error` fırlatır; dolayısıyla eklenti
seviyesinde (`fetchData`) sarmalamak sebebi yakalayamaz. `src/authDiagnostics.js`
bu yüzden `window.fetch`'i geçici olarak sarar, yalnızca başarısız
`tile.googleapis.com` yanıtlarının bir kopyasını okur ve ilk başarılı yanıttan
sonra kendini söker.

## Bilinen sınırlar

- **Karolar fotogrametri, temiz bina hacmi değil.** Yüzey "erimiş" tek parça bir
  mesh; keskin duvar/zemin ayrımı yok. Çarpışma bu yüzden yaklaşıktır —
  çıkıntılarda ve ince geometride takılma olabilir. `_depenetrate()` ışınları
  tek yüzlü meshlerde her zaman isabet etmediği için garanti değil, destekleyici
  önlemdir.
- **Karolar akış hâlinde ve kabadan inceye yüklenir.** İlk gelen karo şehrin
  düşük detaylı hâlidir; karakter `spawnMinTiles` kadar karo görünür olmadan
  doğmaz, yoksa kaba yüzeye basıp detay gelince binaların içinde kalır.
  Doğuştan sonra `settleTime` boyunca zemin yeniden yoklanır ve karakter
  yükselen yüzeye kaldırılır. Yine de gömülü kalırsanız **R** ile yüzeye
  dönebilirsiniz.
- Karoların yetişemediği hızda uçarsanız kısa süreli boşluğa düşebilirsiniz;
  `respawnBelow` eşiğinde başlangıç noktasına dönersiniz.
- **Ağ, çapanın bulunduğu yüzeye çarpabilir.** Doğrudan önünüzdeki duvara
  bağlanıp üstüne salınırsanız duvara yapışırsınız; bu durumda ağ ~0.45 saniye
  sonra kendiliğinden kopar (`stallTime`).
- Telif satırı Google'ın kullanım şartı gereği zorunludur, kaldırmayın.
