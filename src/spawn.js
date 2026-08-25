import { Vector3 } from 'three';
import { makeHit } from './world.js';
import { SWING } from './config.js';

const DOWN = new Vector3( 0, - 1, 0 );
const _origin = new Vector3();
const _hit = makeHit();

// Tarama alanı ve çözünürlüğü.
const RADIUS = 260;
const STEPS = 13;
const PROBE_HEIGHT = 1500;

// Bir noktanın "çapa" sayılması için karakterden en az bu kadar yukarıda olması
// gerekir; swing.tryAttach'taki eşikle uyumlu ama biraz daha muhafazakâr.
const MIN_RISE = 18;

/**
 * Sallanmaya elverişli doğuş noktası arar.
 *
 * Koordinatı elle seçmek kırılgan: bir gökdelenin tam tepesine denk gelirsen
 * (Galata Kulesi durumu) etrafta çapa kalmaz, birkaç yüz metre yanına düşersen
 * alçak bir mahalleye inersin. Bunun yerine çevre taranır ve ETRAFINDA EN ÇOK
 * YÜKSEK YAPI OLAN ALÇAK nokta seçilir — yani kuleler arasındaki sokak.
 *
 * @returns {{point: Vector3, anchors: number, scanned: number}|null}
 */
export function findSwingSpawn( world, centerX = 0, centerZ = 0 ) {

	const points = [];

	for ( let i = 0; i < STEPS; i ++ ) {

		for ( let j = 0; j < STEPS; j ++ ) {

			const x = centerX - RADIUS + ( 2 * RADIUS * i ) / ( STEPS - 1 );
			const z = centerZ - RADIUS + ( 2 * RADIUS * j ) / ( STEPS - 1 );

			_origin.set( x, PROBE_HEIGHT, z );

			if ( world.raycast( _origin, DOWN, PROBE_HEIGHT * 2, _hit ) ) {

				points.push( { x, z, y: _hit.point.y } );

			}

		}

	}

	if ( points.length === 0 ) return null;

	let best = null;
	let bestScore = - 1;

	for ( const p of points ) {

		let anchors = 0;

		for ( const q of points ) {

			if ( q === p ) continue;
			if ( q.y < p.y + MIN_RISE ) continue;

			const dx = q.x - p.x;
			const dz = q.z - p.z;
			if ( dx * dx + dz * dz <= SWING.maxRange * SWING.maxRange ) anchors ++;

		}

		// Eşitlikte merkeze yakın olanı tercih et: kullanıcının seçtiği
		// koordinattan gereksiz yere uzaklaşma.
		const distance = Math.hypot( p.x - centerX, p.z - centerZ );
		const score = anchors * 1000 - distance;

		if ( score > bestScore ) {

			bestScore = score;
			best = { p, anchors };

		}

	}

	if ( ! best ) return null;

	return {
		point: new Vector3( best.p.x, best.p.y, best.p.z ),
		anchors: best.anchors,
		scanned: points.length,
	};

}
