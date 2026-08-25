// Başlangıçta bakılacak yerler (derece). `?konum=newyork` ile seçilir.
export const LOCATIONS = {
	istanbul: { lat: 41.0256, lon: 28.9744, label: 'İstanbul — Galata' },
	newyork: { lat: 40.7484, lon: -73.9857, label: 'New York — Empire State' },
	paris: { lat: 48.8584, lon: 2.2945, label: 'Paris — Eyfel Kulesi' },
	tokyo: { lat: 35.6586, lon: 139.7454, label: 'Tokyo — Tokyo Tower' },
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
};

// Karakter, tuval açıldığında bu yükseklikten aşağı ışın atarak zemini bulur.
export const SPAWN_PROBE_HEIGHT = 1200;
