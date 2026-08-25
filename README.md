# Three.js × Google Photorealistic 3D Tiles

Tarayıcıda çalışan temel bir 3D harita sahnesi: Google'ın **Photorealistic 3D
Tiles** karoları [Three.js](https://threejs.org/) ile render edilir, kamera fare
ile 360° döndürülebilir.

## Ne kullanılıyor?

| Parça | Görev |
| --- | --- |
| `three` | WebGL sahnesi, kamera, render döngüsü |
| `3d-tiles-renderer` | 3D Tiles formatını okur, karoları seviyeye göre yükler/atar |
| `GoogleCloudAuthPlugin` | Google karo sunucusuna oturum anahtarıyla bağlanır |
| `GlobeControls` | Dünya ölçeğinde fare ile döndürme / kaydırma / yakınlaşma |
| `vite` | Geliştirme sunucusu ve derleme |

## Kurulum

```bash
npm install
```

### API anahtarı

1. [Google Cloud Console](https://console.cloud.google.com/)'da bir proje açın.
2. **Map Tiles API**'yi etkinleştirin.
3. Bir API anahtarı oluşturun.
4. Proje kökünde `.env` dosyası oluşturun:

```bash
cp .env.example .env
```

```
VITE_GOOGLE_MAPS_API_KEY=buraya_anahtarınız
```

`.env` dosyası `.gitignore` içinde; anahtarı depoya göndermeyin.

> Anahtar tarayıcıya gönderilen pakete gömülür — istemci tarafı harita
> uygulamalarında bu kaçınılmazdır. Google Cloud Console'dan anahtara
> **HTTP referrer** kısıtı koyun ki başkası kullanamasın.

## Çalıştırma

```bash
npm run dev      # http://localhost:5173
npm run build    # dist/ altına derler
npm run preview  # derlenmiş çıktıyı sunar
```

## Kamera kontrolleri

| Girdi | Hareket |
| --- | --- |
| Sol tuş + sürükle | Haritayı kaydır (yüzey üzerinde sürükleme) |
| **Sağ tuş + sürükle** | **360° döndür ve eğ** |
| Fare tekerleği | İmlecin bulunduğu noktaya yakınlaş / uzaklaş |
| Çift tıklama | Tıklanan noktaya yakınlaş |

Döndürme, ekranın altındaki yüzeyde ışın kesişimiyle bulunan noktanın
etrafında yapılır; yüzeyde karo yoksa referans olarak dünya elipsoidi
kullanılır.

## Başlangıç konumu

Varsayılan olarak İstanbul (Galata) açılır. URL üzerinden değiştirilebilir:

```
?konum=istanbul | newyork | paris | tokyo
?lat=41.0256&lon=28.9744
```

Hazır konumlar `src/main.js` içindeki `LOCATIONS` nesnesinde; kameranın
hedef noktaya göre yüksekliği ve uzaklığı ise `CAMERA_HEIGHT` /
`CAMERA_DISTANCE` sabitlerinde tanımlı.

## Dosyalar

```
index.html      Tuval, kontrol ipuçları, telif satırı
src/main.js     Sahne kurulumu, karo yükleyici, kontroller, render döngüsü
src/style.css   Arayüz stilleri
vite.config.js  Geliştirme sunucusu / derleme ayarları
```

## Notlar

- **Telif bilgisi zorunlu.** Google, Photorealistic 3D Tiles kullanan
  uygulamaların ekranda telif metnini göstermesini şart koşar. Bu metin her
  karede `tiles.getAttributions()` ile toplanıp sağ alttaki `#attribution`
  satırına yazılır; kaldırmayın.
- **Draco çözücü paketlenir.** Google'ın karoları Draco ile sıkıştırılmış glTF
  olarak gelir. Three.js r185'te `DRACOLoader` çözücü dosyalarını
  `import.meta.url` ile referansladığı için Vite bunları otomatik paketler —
  `setDecoderPath()` çağırmaya ya da bir CDN'e bağlanmaya gerek yok.
- **Derleme sırasında anahtar.** Vite `import.meta.env` değerlerini derleme
  anında sabitler; `npm run build` öncesi `.env` hazır olmalıdır. Derlenmiş bir
  çıktıyı hızlıca denemek için `?key=...` parametresi de kabul edilir, ancak
  URL'ler tarayıcı geçmişine ve referrer başlıklarına sızdığından bunu kalıcı
  dağıtımda kullanmayın.
- Sahne nesnelerine tarayıcı konsolundan `mapScene` genel değişkeniyle
  erişilebilir: `mapScene.camera`, `mapScene.controls`, `mapScene.tiles`.
