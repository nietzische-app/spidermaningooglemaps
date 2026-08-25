import {
	MathUtils,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GlobeControls, TilesRenderer } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/core/plugins';
import {
	GLTFExtensionsPlugin,
	TileCompressionPlugin,
	TilesFadePlugin,
} from '3d-tiles-renderer/plugins';

// Anahtar normalde .env dosyasından gelir. Derlenmiş bir yapıyı hızlıca
// denemek için ?key=... parametresi de kabul edilir; URL'ler geçmişe ve
// referrer başlıklarına sızdığı için bunu kalıcı dağıtımda kullanmayın.
// Ayrıca bu okuma sayesinde anahtar derleme sırasında sabite katlanmıyor,
// yani .env olmadan alınan bir build sessizce boş bir sayfaya dönüşmüyor.
function readApiKey() {

	return new URLSearchParams( window.location.search ).get( 'key' )
		|| import.meta.env.VITE_GOOGLE_MAPS_API_KEY
		|| '';

}

const API_KEY = readApiKey();

// Başlangıçta bakılacak yerler. `?konum=newyork` ile seçilir.
const LOCATIONS = {
	istanbul: { lat: 41.0256, lon: 28.9744, label: 'İstanbul — Galata' },
	newyork: { lat: 40.7484, lon: -73.9857, label: 'New York — Empire State' },
	paris: { lat: 48.8584, lon: 2.2945, label: 'Paris — Eyfel Kulesi' },
	tokyo: { lat: 35.6586, lon: 139.7454, label: 'Tokyo — Tokyo Tower' },
};

// Kameranın hedef noktaya göre yüksekliği ve yatay uzaklığı (metre).
const CAMERA_HEIGHT = 900;
const CAMERA_DISTANCE = 1400;

const canvas = document.getElementById( 'scene' );
const placeEl = document.getElementById( 'place' );
const attributionEl = document.getElementById( 'attribution' );
const overlayEl = document.getElementById( 'overlay' );

let renderer, scene, camera, controls, tiles;

// Karo yüklendi mi? Açılıştaki hata bildirimini yalnızca hiç karo
// gelmediyse göstermek için izliyoruz.
let anyTileLoaded = false;
let overlayShown = false;

// Telif metni her karede yeniden hesaplanıyor; çöp üretmemek için
// dizi tekrar tekrar kullanılıyor.
const attributions = [];
let lastAttribution = '';

if ( ! API_KEY ) {

	showOverlay(
		'<div class="box"><strong>Google Maps API anahtarı bulunamadı.</strong><br />' +
		'Proje kökünde bir <code>.env</code> dosyası oluşturup ' +
		'<code>VITE_GOOGLE_MAPS_API_KEY=anahtarınız</code> satırını ekleyin, ' +
		'ardından geliştirme sunucusunu yeniden başlatın.<br /><br />' +
		'Anahtarın bağlı olduğu projede <em>Map Tiles API</em> etkin olmalıdır.</div>'
	);

} else {

	init();
	animate();

}

function init() {

	renderer = new WebGLRenderer( { canvas, antialias: true } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
	renderer.setSize( window.innerWidth, window.innerHeight );

	scene = new Scene();

	// Dünya ölçeğinde çalıştığımız için far düzlemi çok uzakta; near/far
	// değerlerini her karede GlobeControls sahneye göre yeniden ayarlıyor.
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1.6e8 );

	// Google'ın 3D Tiles glTF'leri Draco ile sıkıştırılmış geliyor. three r185'te
	// DRACOLoader çözücü dosyalarını import.meta.url üzerinden kendisi
	// referansladığı için Vite onları otomatik paketliyor; setDecoderPath()
	// ya da harici bir CDN gerekmiyor.
	const dracoLoader = new DRACOLoader();

	tiles = new TilesRenderer();
	// URL'yi ve oturum anahtarını GoogleCloudAuthPlugin ayarlıyor.
	tiles.registerPlugin( new GoogleCloudAuthPlugin( {
		apiToken: API_KEY,
		autoRefreshToken: true,
	} ) );
	tiles.registerPlugin( new GLTFExtensionsPlugin( { dracoLoader } ) );
	tiles.registerPlugin( new TileCompressionPlugin() );
	tiles.registerPlugin( new TilesFadePlugin() );

	tiles.setCamera( camera );
	scene.add( tiles.group );

	tiles.addEventListener( 'load-model', () => {

		anyTileLoaded = true;
		hideOverlay();

	} );

	tiles.addEventListener( 'load-error', ( { error } ) => {

		console.error( '3D Tiles yüklenemedi:', error );

		// Tek tük karo hatası sahneyi kapatmasın; yalnızca hiçbir şey
		// yüklenemediyse (tipik olarak anahtar/yetki sorunu) uyarı göster.
		if ( ! anyTileLoaded ) {

			showOverlay(
				'<div class="box"><strong>Karolar yüklenemedi.</strong><br />' +
				'API anahtarını ve Google Cloud projesinde <em>Map Tiles API</em>\'nin ' +
				'etkin olup olmadığını kontrol edin. Ayrıntı için tarayıcı konsoluna bakın.</div>'
			);

		}

	} );

	// Fare ile 360° dönüş, eğim, kaydırma ve imlece yakınlaşma.
	controls = new GlobeControls( scene, camera, canvas );
	controls.enableDamping = true;
	controls.setEllipsoid( tiles.ellipsoid, tiles.group );

	const location = resolveLocation();
	placeCamera( location );
	placeEl.textContent = location.label;

	window.addEventListener( 'resize', onResize );

	// Tarayıcı konsolundan sahneyi kurcalamak için: mapScene.camera.position vb.
	window.mapScene = { renderer, scene, camera, controls, tiles };

}

// `?konum=` parametresini ya da doğrudan `?lat=..&lon=..` çiftini okur.
function resolveLocation() {

	const params = new URLSearchParams( window.location.search );
	const lat = parseFloat( params.get( 'lat' ) );
	const lon = parseFloat( params.get( 'lon' ) );

	if ( Number.isFinite( lat ) && Number.isFinite( lon ) ) {

		return { lat, lon, label: `${ lat.toFixed( 4 ) }, ${ lon.toFixed( 4 ) }` };

	}

	const key = ( params.get( 'konum' ) || 'istanbul' ).toLowerCase();
	return LOCATIONS[ key ] || LOCATIONS.istanbul;

}

// Kamerayı verilen enlem/boylamdaki yüzey noktasının güneyine ve üstüne
// yerleştirip o noktaya baktırır; "up" yönü yerel dikey olur.
function placeCamera( { lat, lon } ) {

	const latRad = MathUtils.degToRad( lat );
	const lonRad = MathUtils.degToRad( lon );

	const surface = new Vector3();
	const north = new Vector3();
	const up = new Vector3();
	const east = new Vector3(); // kullanılmıyor, API'nin zorunlu çıkış parametresi

	tiles.ellipsoid.getCartographicToPosition( latRad, lonRad, 0, surface );
	tiles.ellipsoid.getEastNorthUpAxes( latRad, lonRad, east, north, up );

	camera.position
		.copy( surface )
		.addScaledVector( up, CAMERA_HEIGHT )
		.addScaledVector( north, - CAMERA_DISTANCE );
	camera.up.copy( up );
	camera.lookAt( surface );

}

function onResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	requestAnimationFrame( animate );

	// Sıra önemli: kontroller kamerayı (ve near/far'ı) günceller, sonra
	// güncel matrisle karo seçimi yapılır.
	controls.update();
	camera.updateMatrixWorld();

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

	updateAttribution();

}

function updateAttribution() {

	attributions.length = 0;
	tiles.getAttributions( attributions );

	const text = attributions
		.filter( item => item.type === 'string' )
		.map( item => item.value )
		.join( ' · ' );

	if ( text !== lastAttribution ) {

		lastAttribution = text;
		attributionEl.textContent = text;

	}

}

function hideOverlay() {

	overlayShown = false;
	overlayEl.hidden = true;

}

function showOverlay( html ) {

	if ( overlayShown ) return;

	overlayShown = true;
	overlayEl.innerHTML = html;
	overlayEl.hidden = false;

}
