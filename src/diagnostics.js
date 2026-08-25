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
			? '>>> SONUÇ: yüzey DÜZ. Bina kabartması yok.'
			: `>>> SONUÇ: geometri 3D. ${ spread.toFixed( 0 ) } m kabartma var.` );

		if ( spread >= 5 && above10 === 0 ) {

			L.push( '>>> Ama çevrende karakterden yüksek nokta yok:' );
			L.push( '    büyük ihtimalle en yüksek yerdesin (çatı/tepe).' );

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
