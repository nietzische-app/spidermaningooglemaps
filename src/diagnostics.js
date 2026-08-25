import { Box3, Vector3 } from 'three';
import { makeHit } from './world.js';

const DOWN = new Vector3( 0, - 1, 0 );
const _origin = new Vector3();
const _dir = new Vector3();
const _center = new Vector3();
const _hit = makeHit();
const _box = new Box3();

/**
 * Sahnenin gerçek durumunu ölçer. "Harita 3D değil" şikâyetini kesin olarak
 * doğrular ya da çürütür: karakterin çevresine ızgara hâlinde ışın atıp
 * yükseklik farkını ölçer. Düz bir levhada fark ~0 çıkar; gerçek bina
 * kabartmasında onlarca metre.
 */
export function runDiagnostics( { world, player, camera } ) {

	const L = [];
	const data = {};

	L.push( '=== TANI RAPORU ===' );

	// --- Karo motoru ---
	if ( world.tiles ) {

		const t = world.tiles;
		data.errorTarget = t.errorTarget;
		data.visibleTiles = t.visibleTiles.size;
		data.activeTiles = t.activeTiles ? t.activeTiles.size : - 1;

		L.push( `errorTarget      : ${ data.errorTarget }` );
		L.push( `görünür karo     : ${ data.visibleTiles }` );
		L.push( `aktif karo       : ${ data.activeTiles }` );

		// --- Yükleme istatistikleri: inceltmenin nerede takıldığını söyler ---
		const st = t.stats;
		data.stats = { ...st };
		L.push( `kuyrukta         : ${ st.queued }` );
		L.push( `indiriliyor      : ${ st.downloading }` );
		L.push( `ayrıştırılıyor   : ${ st.parsing }` );
		L.push( `yüklendi         : ${ st.loaded }` );
		L.push( `BAŞARISIZ        : ${ st.failed }` );
		L.push( `frustum içi      : ${ st.inFrustum }` );
		L.push( `gezilen (used)   : ${ st.used }` );

		// --- Hata hesabı: sseDenominator çözünürlüğe bağlı; çözünürlük
		//     kayıtlı değilse ekran-uzayı hatası çöker ve inceltme başlamaz.
		const res = t.cameraMap && t.cameraMap.get( camera );
		data.resolution = res ? [ res.x, res.y ] : null;
		L.push( `kayıtlı kamera   : ${ t.cameraMap ? t.cameraMap.size : '?' }` );
		L.push( `çözünürlük       : ${ res ? `${ res.x } x ${ res.y }` : 'YOK — sorun burada' }` );

		const ci = t.cameraInfo && t.cameraInfo[ 0 ];
		data.sseDenominator = ci ? ci.sseDenominator : null;
		L.push( `sseDenominator   : ${ ci ? ci.sseDenominator.toExponential( 3 ) : '?' }` );
		L.push( `camera.far       : ${ camera.far }` );

		// --- Görünür karoların derinliği: inceltme ne kadar derine indi? ---
		let dMin = Infinity, dMax = - Infinity, dSum = 0, n = 0;
		let geMin = Infinity, geMax = - Infinity;
		t.visibleTiles.forEach( tile => {

			const depth = tile.internal ? tile.internal.depth : - 1;
			if ( depth >= 0 ) { dMin = Math.min( dMin, depth ); dMax = Math.max( dMax, depth ); dSum += depth; n ++; }
			const ge = tile.geometricError;
			if ( typeof ge === 'number' ) { geMin = Math.min( geMin, ge ); geMax = Math.max( geMax, ge ); }

		} );

		if ( n > 0 ) {

			data.depth = { min: dMin, max: dMax, avg: dSum / n };
			data.geometricError = { min: geMin, max: geMax };
			L.push( `karo derinliği   : min ${ dMin }, max ${ dMax }, ort ${ ( dSum / n ).toFixed( 1 ) }` );
			L.push( `geometrik hata   : ${ geMin.toFixed( 2 ) } — ${ geMax.toFixed( 1 ) } m` );

		}

		// --- Rapor kararlı mı? Yükleme sürerken alınan ölçüm yanıltır ---
		const busy = st.queued + st.downloading + st.parsing;
		data.busy = busy;
		L.push( '' );
		L.push( busy > 0
			? `>>> HÂLÂ YÜKLENİYOR (kuyruk ${ st.queued }, ayrıştırma ${ st.parsing }).\n` +
			  '    Bu rapor KARARSIZ. Kuyruk boşalınca "Yenile" ile tekrar ölçün.'
			: '>>> Yükleme durdu, rapor kararlı.' );
		L.push( '' );

		const s = t.group.scale;
		data.groupScale = [ s.x, s.y, s.z ];
		L.push( `grup ölçeği      : ${ s.x.toFixed( 4 ) }, ${ s.y.toFixed( 4 ) }, ${ s.z.toFixed( 4 ) }` );

	} else {

		L.push( 'kaynak           : prova şehri (mock)' );

	}

	// --- Geometri hacmi ---
	let meshes = 0;
	let triangles = 0;
	world.collider.traverse( o => {

		if ( o.isMesh && o.geometry ) {

			meshes ++;
			const g = o.geometry;
			triangles += g.index
				? g.index.count / 3
				: ( g.attributes.position ? g.attributes.position.count / 3 : 0 );

		}

	} );
	data.meshes = meshes;
	data.triangles = Math.round( triangles );
	L.push( `mesh sayısı      : ${ meshes }` );
	L.push( `üçgen sayısı     : ${ data.triangles.toLocaleString( 'tr-TR' ) }` );

	_box.setFromObject( world.collider );
	if ( ! _box.isEmpty() ) {

		const size = _box.getSize( new Vector3() );
		data.extent = [ size.x, size.y, size.z ].map( v => Math.round( v ) );
		L.push( `kapsam (x,y,z)   : ${ data.extent.join( ' × ' ) } m` );

	}

	// --- Karakter / kamera ---
	player.getCenter( _center );
	data.playerY = player.position.y;
	data.camDistance = camera.position.distanceTo( _center );
	L.push( `karakter y       : ${ player.position.y.toFixed( 1 ) } m` );
	L.push( `kamera uzaklığı  : ${ data.camDistance.toFixed( 1 ) } m` );

	// --- Dikey tarama: 3D kabartma var mı? ---
	// Karakterin çevresinde ızgara; her noktada yukarıdan aşağı ışın.
	const RADIUS = 120;
	const STEPS = 9;
	const FROM_ABOVE = 400;

	let min = Infinity;
	let max = - Infinity;
	let misses = 0;
	let above10 = 0;

	for ( let i = 0; i < STEPS; i ++ ) {

		for ( let j = 0; j < STEPS; j ++ ) {

			const x = player.position.x - RADIUS + ( 2 * RADIUS * i ) / ( STEPS - 1 );
			const z = player.position.z - RADIUS + ( 2 * RADIUS * j ) / ( STEPS - 1 );

			_origin.set( x, player.position.y + FROM_ABOVE, z );

			if ( world.raycast( _origin, DOWN, FROM_ABOVE * 2, _hit ) ) {

				min = Math.min( min, _hit.point.y );
				max = Math.max( max, _hit.point.y );
				if ( _hit.point.y > player.position.y + 10 ) above10 ++;

			} else {

				misses ++;

			}

		}

	}

	const total = STEPS * STEPS;
	const spread = max - min;
	data.heightSpread = spread;
	data.gridMisses = misses;
	data.above10 = above10;

	L.push( '' );
	L.push( `--- ${ RADIUS * 2 } m karelik alanda yükseklik taraması (${ total } nokta) ---` );
	L.push( `ışın isabet      : ${ total - misses }/${ total }` );

	if ( misses < total ) {

		L.push( `en alçak / yüksek: ${ min.toFixed( 1 ) } m / ${ max.toFixed( 1 ) } m` );
		L.push( `YÜKSEKLİK FARKI  : ${ spread.toFixed( 1 ) } m` );
		L.push( `karakterden 10 m+: ${ above10 } nokta` );
		L.push( '' );
		L.push( spread < 5
			? '>>> GEOMETRİ: yüzey DÜZ. Bina kabartması yok.'
			: `>>> GEOMETRİ: 3D, ${ spread.toFixed( 0 ) } m kabartma var.` );

		// Geometrinin 3D olması ağ atılabileceği anlamına gelmez: çapa için
		// çevrede karakterden YÜKSEK yapı gerekir.
		const ratio = above10 / ( total - misses );
		L.push( '' );
		L.push( `>>> ÇAPA: ${ above10 }/${ total - misses } nokta senden 10 m+ yüksek ` +
			`(en yüksek ${ max.toFixed( 1 ) } m, sen ${ player.position.y.toFixed( 1 ) } m)` );

		if ( spread >= 5 && ratio < 0.08 ) {

			L.push( '' );
			L.push( '>>> SONUÇ: harita 3D ama BURADAN SALLANAMAZSIN.' );
			L.push( '    Çevrendeki neredeyse her şey senden alçak —' );
			L.push( '    büyük ihtimalle en yüksek yapının tepesindesin.' );
			L.push( '    Dene: ?konum=levent&yukseklik=150' );
			L.push( '          ?konum=newyork&yukseklik=200' );

		} else if ( spread >= 5 ) {

			L.push( '>>> SONUÇ: çevrede ağ atılabilecek hedef var.' );

		}

	}

	// --- Yatay tarama: ağ atılacak hedef var mı? ---
	L.push( '' );
	L.push( '--- 8 yönde yatay ışın (160 m) ---' );
	const dirs = [ 'K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB' ];
	data.horizontal = [];

	for ( let i = 0; i < 8; i ++ ) {

		const a = ( i / 8 ) * Math.PI * 2;
		_dir.set( Math.sin( a ), 0.25, Math.cos( a ) ).normalize();

		if ( world.raycast( _center, _dir, 160, _hit ) ) {

			const rise = _hit.point.y - player.position.y;
			data.horizontal.push( { dir: dirs[ i ], d: _hit.distance, rise } );
			L.push( `${ dirs[ i ].padEnd( 3 ) }: ${ _hit.distance.toFixed( 0 ).padStart( 4 ) } m ötede, ` +
				`${ rise >= 0 ? '+' : '' }${ rise.toFixed( 0 ) } m yükseklik` );

		} else {

			data.horizontal.push( { dir: dirs[ i ], d: null, rise: null } );
			L.push( `${ dirs[ i ].padEnd( 3 ) }: çarpma yok` );

		}

	}

	const text = L.join( '\n' );
	return { text, data };

}
