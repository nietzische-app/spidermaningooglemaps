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

## Başlangıç konumu

```
?konum=istanbul | newyork | paris | tokyo
?lat=41.0256&lon=28.9744
```

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

## Bilinen sınırlar

- **Karolar fotogrametri, temiz bina hacmi değil.** Yüzey "erimiş" tek parça bir
  mesh; keskin duvar/zemin ayrımı yok. Çarpışma bu yüzden yaklaşıktır —
  çıkıntılarda ve ince geometride takılma olabilir. `_depenetrate()` ışınları
  tek yüzlü meshlerde her zaman isabet etmediği için garanti değil, destekleyici
  önlemdir.
- **Karolar akış hâlinde yüklenir.** Yüklenmeden önce zemin *yoktur*; karakter
  bu yüzden zemini ışınla bulana kadar bekletilir, düşerse `respawnBelow`
  eşiğinde başlangıç noktasına döner. Karoların yetişemediği hızda uçarsanız
  kısa süreli boşluğa düşebilirsiniz.
- **Ağ, çapanın bulunduğu yüzeye çarpabilir.** Doğrudan önünüzdeki duvara
  bağlanıp üstüne salınırsanız duvara yapışırsınız; bu durumda ağ ~0.45 saniye
  sonra kendiliğinden kopar (`stallTime`).
- Telif satırı Google'ın kullanım şartı gereği zorunludur, kaldırmayın.
