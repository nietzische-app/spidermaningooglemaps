import { Vector3 } from 'three';
import { CAMERA } from './config.js';
import { makeHit } from './world.js';

const _head = new Vector3();
const _offset = new Vector3();
const _desired = new Vector3();
const _look = new Vector3();
const _dir = new Vector3();
const _hit = makeHit();

// Karakterin etrafında dönen 3. şahıs kamerası. Yaw sınırsız (360°),
// pitch tepe/dip noktalarında kilitleniyor.
export class CameraRig {

	constructor( camera ) {

		this.camera = camera;
		this.yaw = 0;
		this.pitch = 0.22;
		this.distance = CAMERA.distance;
		this._initialised = false;

	}

	update( dt, input, player, world ) {

		this.yaw -= input.mouseDX * CAMERA.sensitivity;
		this.pitch -= input.mouseDY * CAMERA.sensitivity;
		this.pitch = Math.max( CAMERA.pitchMin, Math.min( CAMERA.pitchMax, this.pitch ) );

		// Yaw'ı sarmala, sonsuza büyümesin.
		if ( this.yaw > Math.PI ) this.yaw -= Math.PI * 2;
		else if ( this.yaw < - Math.PI ) this.yaw += Math.PI * 2;

		player.getHead( _head );

		const cp = Math.cos( this.pitch );
		_offset.set(
			Math.sin( this.yaw ) * cp,
			Math.sin( this.pitch ),
			Math.cos( this.yaw ) * cp
		);

		let distance = CAMERA.distance;

		// Kamera duvarın arkasında kalmasın: kafadan kameraya ışın at.
		_dir.copy( _offset );
		if ( world.raycast( _head, _dir, distance + 0.5, _hit ) ) {

			distance = Math.max( CAMERA.minDistance, _hit.distance - 0.5 );

		}

		_desired.copy( _head ).addScaledVector( _offset, distance );

		if ( ! this._initialised ) {

			this.camera.position.copy( _desired );
			this._initialised = true;

		} else {

			// Kare hızından bağımsız yumuşatma.
			const t = 1 - Math.exp( - CAMERA.followLerp * dt );
			this.camera.position.lerp( _desired, t );

		}

		// Bakış hedefi kafanın biraz üstünde: karakter ekranın alt yarısında
		// kalır, nişangah boş dünyayı gösterir.
		_look.copy( _head ).setY( _head.y + CAMERA.lookLift );
		this.camera.lookAt( _look );

	}

	reset() {

		this._initialised = false;

	}

}
