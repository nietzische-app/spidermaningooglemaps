// Başlangıçta bakılacak yerler (derece). `?konum=newyork` ile seçilir.
export const LOCATIONS = {
	// Varsayılan: gökdelen bölgesi. Sallanmak için çevrende senden YÜKSEK
	// yapılar olması şart; tarihi yarımadada tek yüksek yapının tepesinde
	// doğarsan ağ atacak hedef kalmaz.
	istanbul: { lat: 41.0820, lon: 29.0090, label: 'İstanbul — Levent' },
	levent: { lat: 41.0820, lon: 29.0090, label: 'İstanbul — Levent' },
	maslak: { lat: 41.1120, lon: 29.0200, label: 'İstanbul — Maslak' },
	// Galata Kulesi'nin tam tepesi — manzara güzel ama etrafta ağ atacak
	// bir şey yok, kule zaten en yüksek nokta.
	galata: { lat: 41.0256, lon: 28.9744, label: 'İstanbul — Galata Kulesi' },
	// Aşağıdakiler bilinçli olarak "simge yapı" değil, gökdelen BÖLGESİ
	// koordinatlarıdır: simge yapının tepesinde doğmak yukarıdaki Galata
	// sorununun aynısını üretir (Empire State, Eyfel, Tokyo Tower hep
	// çevrelerinin en yüksek yapısıdır).
	newyork: { lat: 40.7549, lon: - 73.9840, label: 'New York — Midtown' },
	paris: { lat: 48.8918, lon: 2.2377, label: 'Paris — La Défense' },
	tokyo: { lat: 35.6896, lon: 139.6917, label: 'Tokyo — Shinjuku' },
	// Simge yapılar: manzara için, sallanmak için değil.
	empire: { lat: 40.7484, lon: - 73.9857, label: 'New York — Empire State' },
	eyfel: { lat: 48.8584, lon: 2.2945, label: 'Paris — Eyfel Kulesi' },
};

// Karo detay (LOD) ayarları.
export const TILES = {
	// Ekran-uzayı hata eşiği (piksel). Bir karo, izdüşen geometrik hatası bu
	// değeri aştığında bir alt seviyeye bölünür — yani KÜÇÜK değer = DAHA ÇOK
	// detay = daha çok istek ve daha çok fatura.
	//
	// GoogleCloudAuthPlugin varsayılan olarak bunu 20 yapar; şehrin üstünde
	// uçmak için makul ama sokak seviyesinde binalar hiç ayrışmaz, harita
	// bulanık düz bir levha gibi kalır ve ağ atacak geometri oluşmaz.
	errorTarget: 5,

	// Karakter, en az bu kadar karo görünür olmadan doğmaz. Aksi hâlde kaba
	// (düşük detaylı) yüzeye basar, detay gelince binaların içinde kalır.
	spawnMinTiles: 12,

	// Doğduktan sonra bu süre boyunca zemin yeniden yoklanır: karolar
	// inceldikçe gerçek zemin yükselir ve karakterin altından kayar.
	settleTime: 5,
	settleProbeHeight: 60,
};

// Karakter fiziği. Gerçekçi değil, oynanabilir olacak şekilde ayarlandı:
// yerçekimi gerçek dünyanın ~2.5 katı, yoksa sarkaç hareketi ağır çekim gibi durur.
export const PHYSICS = {
	gravity: 26,
	moveSpeed: 9,
	sprintSpeed: 16,
	acceleration: 60,
	airControl: 0.22,
	jumpSpeed: 12,
	maxSpeed: 120,
	radius: 0.9,
	height: 3.0,
	stepHeight: 0.6,
	groundSnap: 0.35,
	respawnBelow: -400,
};

// Ağ atma / sarkaç ayarları.
export const SWING = {
	maxRange: 160,
	minRopeLength: 6,
	// İpi toplama hızı. Yüksek değerler sarkacı vinçe çevirir: karakteri
	// doğrudan çapanın (yani binanın) üstüne çeker ve duvara yapıştırır.
	reelSpeed: 3,
	// İp, bağlandığı andaki uzunluğun bu oranından kısalmaz — yine aynı
	// sebeple: çapaya fazla yaklaşmak salınımı öldürür.
	minRopeFactor: 0.55,
	// Duvara sıkışıp kalırsan ağ kendiliğinden kopsun.
	stallSpeed: 2,
	stallTime: 0.45,
	assist: 26,
	releaseBoost: 5.5,
	ropeColor: 0xf2f4f8,
};

export const CAMERA = {
	distance: 13,
	minDistance: 2.5,
	headHeight: 2.4,
	pitchMin: -1.15,
	pitchMax: 1.15,
	sensitivity: 0.0022,
	lookLift: 1.7,
	followLerp: 14,
	fov: 68,
	// Görüş mesafesi. 100 km'lik bir far düzlemi, ufka kadar HER karoyu
	// frustuma sokar; errorTarget düşükken motor binlerce uzak karoyu da
	// inceltmeye çalışır ve yakındaki karolara sıra gelmez. Sokak seviyesi
	// için 3 km fazlasıyla yeterli; kesim sis ile gizleniyor.
	far: 3000,
	fogNear: 500,
	fogFar: 2900,
};

// Karakter, tuval açıldığında bu yükseklikten aşağı ışın atarak zemini bulur.
export const SPAWN_PROBE_HEIGHT = 1200;
