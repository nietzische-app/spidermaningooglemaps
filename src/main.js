import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { CAMERA, LOCATIONS, SPAWN_PROBE_HEIGHT } from './config.js';
import { CameraRig } from './cameraRig.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { Swing } from './swing.js';
import { World } from './world.js';

// Anahtar normalde .env dosyasından gelir. Derlenmiş bir yapıyı hızlıca
// denemek için ?key=... parametresi de kabul edilir; URL'ler geçmişe ve
// referrer başlıklarına sızdığı için bunu kalıcı dağıtımda kullanmayın.
// Ayrıca bu okuma sayesinde anahtar derleme sırasında sabite katlanmıyor,
// yani .env olmadan alınan bir build sessizce boş bir sayfaya dönüşmüyor.
const params = new URLSearchParams( window.location.search );
const API_KEY = params.get( 'key' ) || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const USE_MOCK = params.get( 'mock' ) === '1' || ! API_KEY;

const canvas = document.getElementById( 'scene' );
const hud = new Hud();

const renderer = new WebGLRenderer( { canvas, antialias: true } );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.setSize( window.innerWidth, window.innerHeight );

const scene = new Scene();
const camera = new PerspectiveCamera(
	CAMERA.fov,
	window.innerWidth / window.innerHeight,
	0.5,
	100000
);
camera.position.set( 0, 320, 320 );

const world = new World( scene );
const location = resolveLocation();

if ( USE_MOCK ) {

	world.initMock();
	hud.setPlace( API_KEY ? 'Prova şehri (mock)' : 'Prova şehri — API anahtarı yok' );

} else {

	world.initTiles( API_KEY, location );
	world.tiles.setCamera( camera );
	hud.setPlace( location.label );

	world.onError = () => {

		hud.showOverlay(
			'<strong>Karolar yüklenemedi.</strong><br />' +
			'API anahtarını ve Google Cloud projesinde <em>Map Tiles API</em>\'nin ' +
			'etkin olup olmadığını kontrol edin.<br /><br />' +
			'Mekanikleri anahtarsız denemek için <code>?mock=1</code> ekleyin.'
		);

	};

}

const input = new Input( canvas );
const player = new Player( scene );
const swing = new Swing( scene );
const rig = new CameraRig( camera );

const spawnPoint = new Vector3();
let spawned = false;

input.onLockChange = locked => {

	if ( locked ) hud.hideOverlay();
	else showStartCard();

};

// Tarayıcı konsolundan sahneyi kurcalamak için: game.player.velocity vb.
window.game = { renderer, scene, camera, world, player, swing, rig, input };

showStartCard();
window.addEventListener( 'resize', onResize );
renderer.setAnimationLoop( tick );

function showStartCard() {

	hud.showOverlay(
		'<strong>Başlamak için tıklayın</strong>' +
		'<div class="keys">' +
		'<span><b>Fare</b> Kamerayı döndür</span>' +
		'<span><b>W A S D</b> Koş</span>' +
		'<span><b>Shift</b> Hızlan</span>' +
		'<span><b>Space</b> Zıpla</span>' +
		'<span><b>Sol tık (basılı)</b> Ağ at ve sallan</span>' +
		'<span><b>Bırak</b> Ağı kop, momentumla fırla</span>' +
		'<span><b>Esc</b> İmleci serbest bırak</span>' +
		'</div>'
	);

}

function resolveLocation() {

	const lat = parseFloat( params.get( 'lat' ) );
	const lon = parseFloat( params.get( 'lon' ) );

	if ( Number.isFinite( lat ) && Number.isFinite( lon ) ) {

		return { lat, lon, label: `${ lat.toFixed( 4 ) }, ${ lon.toFixed( 4 ) }` };

	}

	const key = ( params.get( 'konum' ) || 'istanbul' ).toLowerCase();
	return LOCATIONS[ key ] || LOCATIONS.istanbul;

}

function onResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
	renderer.setSize( window.innerWidth, window.innerHeight );

}

// Karolar akış hâlinde yüklendiği için zemin ilk karede hazır olmayabilir:
// yukarıdan aşağı ışın tutana kadar her karede yeniden denenir.
function trySpawn() {

	const ground = Player.findGround( world, 0, 0, SPAWN_PROBE_HEIGHT );
	if ( ! ground ) return;

	spawnPoint.copy( ground ).setY( ground.y + 0.05 );
	player.position.copy( spawnPoint );
	player.velocity.set( 0, 0, 0 );
	rig.reset();
	spawned = true;

}

let last = performance.now();

function tick( now ) {

	// Sekme arka plandayken biriken devasa dt fiziği patlatmasın.
	const dt = Math.min( 0.05, ( now - last ) / 1000 ) || 0;
	last = now;

	world.update( camera, renderer );

	if ( ! spawned ) {

		trySpawn();

	} else {

		swing.syncCameraDirection( camera );

		if ( input.leftPressed ) swing.tryAttach( camera, world, player );
		if ( input.leftReleased ) swing.release( player );

		player.update( dt, input, rig.yaw, world, swing.attached );
		swing.applyConstraint( player, dt, input );
		swing.updateVisual( player );

		// İp kısıtı karakteri geometriye itmiş olabilir.
		player.resolve( world );
		player.object.position.copy( player.position );

		if ( player.checkRespawn( spawnPoint ) ) rig.reset();

	}

	rig.update( dt, input, player, world );

	renderer.render( scene, camera );

	hud.setSwinging( swing.attached );
	hud.setTelemetry( player, swing.attached, spawned );
	if ( world.tiles ) hud.setAttribution( world.getAttributions( [] ) );

	input.endFrame();

}
