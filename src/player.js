import {
	CapsuleGeometry,
	Group,
	Mesh,
	MeshLambertMaterial,
	Vector3,
} from 'three';
import { PHYSICS } from './config.js';
import { makeHit } from './world.js';

const DOWN = new Vector3( 0, - 1, 0 );
const UP = new Vector3( 0, 1, 0 );

const _delta = new Vector3();
const _origin = new Vector3();
const _dir = new Vector3();
const _probe = new Vector3();
const _hit = makeHit();
const _hit2 = makeHit();

// Yatay itme-dışarı için 6 yön (60 derecede bir).
const PROBE_DIRS = [];
for ( let i = 0; i < 6; i ++ ) {

	const a = ( i / 6 ) * Math.PI * 2;
	PROBE_DIRS.push( new Vector3( Math.cos( a ), 0, Math.sin( a ) ) );

}

export class Player {

	constructor( scene ) {

		this.position = new Vector3( 0, 0, 0 );   // ayak hizası
		this.velocity = new Vector3();
		this.grounded = false;
		this.facing = 0;

		const { radius, height } = PHYSICS;

		this.object = new Group();

		const body = new Mesh(
			new CapsuleGeometry( radius, Math.max( 0.1, height - 2 * radius ), 6, 12 ),
			new MeshLambertMaterial( { color: 0xd6202f } )
		);
		body.position.y = height / 2;
		this.object.add( body );

		// Hangi yöne baktığı belli olsun diye küçük bir burun.
		const nose = new Mesh(
			new CapsuleGeometry( radius * 0.32, radius * 0.5, 4, 8 ),
			new MeshLambertMaterial( { color: 0x1b3a8f } )
		);
		nose.rotation.x = Math.PI / 2;
		nose.position.set( 0, height * 0.72, - radius * 0.95 );
		this.object.add( nose );

		scene.add( this.object );

	}

	getCenter( target ) {

		return target.copy( this.position ).setY( this.position.y + PHYSICS.height / 2 );

	}

	getHead( target ) {

		return target.copy( this.position ).setY( this.position.y + PHYSICS.height * 0.8 );

	}

	// Kamera yönüne göre WASD ivmesi + yerçekimi. Çarpışma `_move` içinde.
	update( dt, input, cameraYaw, world, swinging ) {

		const { velocity } = this;

		let fwd = 0;
		let strafe = 0;
		if ( input.isDown( 'KeyW' ) ) fwd += 1;
		if ( input.isDown( 'KeyS' ) ) fwd -= 1;
		if ( input.isDown( 'KeyD' ) ) strafe += 1;
		if ( input.isDown( 'KeyA' ) ) strafe -= 1;

		const fx = - Math.sin( cameraYaw );
		const fz = - Math.cos( cameraYaw );
		const rx = Math.cos( cameraYaw );
		const rz = - Math.sin( cameraYaw );

		_delta.set( rx * strafe + fx * fwd, 0, rz * strafe + fz * fwd );
		const hasInput = _delta.lengthSq() > 0;
		if ( hasInput ) _delta.normalize();

		const sprinting = input.isDown( 'ShiftLeft' ) || input.isDown( 'ShiftRight' );
		const targetSpeed = sprinting ? PHYSICS.sprintSpeed : PHYSICS.moveSpeed;

		if ( ! swinging ) {

			const control = this.grounded ? 1 : PHYSICS.airControl;

			if ( hasInput ) {

				const accel = PHYSICS.acceleration * control * dt;
				velocity.x += _delta.x * accel;
				velocity.z += _delta.z * accel;

				// Yerdeyken yatay hızı üst sınırda tut.
				if ( this.grounded ) {

					const hs = Math.hypot( velocity.x, velocity.z );
					if ( hs > targetSpeed ) {

						velocity.x *= targetSpeed / hs;
						velocity.z *= targetSpeed / hs;

					}

				}

			} else if ( this.grounded ) {

				// Sürtünme.
				const damp = Math.exp( - 10 * dt );
				velocity.x *= damp;
				velocity.z *= damp;

			}

			if ( this.grounded && input.wasPressed( 'Space' ) ) {

				velocity.y = PHYSICS.jumpSpeed;
				this.grounded = false;

			}

		}

		velocity.y -= PHYSICS.gravity * dt;

		const speed = velocity.length();
		if ( speed > PHYSICS.maxSpeed ) velocity.multiplyScalar( PHYSICS.maxSpeed / speed );

		this._move( dt, world );
		this._face( dt, cameraYaw );

	}

	// Dikey ve yatay hareket ayrı çözülüyor; bu, zeminde sürünürken takılmayı
	// ve yüksek hızda duvarların içinden geçmeyi (tunneling) büyük ölçüde önler.
	_move( dt, world ) {

		const { radius, height, stepHeight, groundSnap } = PHYSICS;
		const { position, velocity } = this;

		// Hızlıyken adımı böl: her alt adımda yarıçapın yarısından fazla yol alma.
		const travel = velocity.length() * dt;
		const steps = Math.min( 8, Math.max( 1, Math.ceil( travel / ( radius * 0.5 ) ) ) );
		const h = dt / steps;

		for ( let s = 0; s < steps; s ++ ) {

			// --- Dikey ---
			const dy = velocity.y * h;

			if ( dy <= 0 ) {

				_origin.set( position.x, position.y + stepHeight, position.z );
				const reach = stepHeight - dy + groundSnap;

				if ( world.raycast( _origin, DOWN, reach, _hit ) ) {

					position.y = _hit.point.y;
					velocity.y = 0;
					this.grounded = true;

				} else {

					position.y += dy;
					this.grounded = false;

				}

			} else {

				_origin.set( position.x, position.y + height * 0.5, position.z );
				const reach = height * 0.5 + dy;

				if ( world.raycast( _origin, UP, reach, _hit ) ) {

					// Tavana çarptı.
					position.y = _hit.point.y - height;
					velocity.y = 0;

				} else {

					position.y += dy;

				}

				this.grounded = false;

			}

			// --- Yatay ---
			_delta.set( velocity.x * h, 0, velocity.z * h );
			let remaining = _delta.length();

			if ( remaining > 1e-6 ) {

				_dir.copy( _delta ).divideScalar( remaining );

				// İki yineleme: çarp, normale dik kaydır, kalan yolu dene.
				for ( let iter = 0; iter < 2 && remaining > 1e-6; iter ++ ) {

					this.getCenter( _origin );

					if ( world.raycast( _origin, _dir, remaining + radius, _hit ) ) {

						const allowed = Math.max( 0, _hit.distance - radius );
						position.x += _dir.x * allowed;
						position.z += _dir.z * allowed;
						remaining -= allowed;

						// Yüzeye giren hız bileşenini sil (kayma).
						const vn = velocity.dot( _hit.normal );
						if ( vn < 0 ) velocity.addScaledVector( _hit.normal, - vn );

						_dir.addScaledVector( _hit.normal, - _dir.dot( _hit.normal ) );
						if ( _dir.lengthSq() < 1e-8 ) break;
						_dir.normalize();

					} else {

						position.x += _dir.x * remaining;
						position.z += _dir.z * remaining;
						remaining = 0;

					}

				}

			}

		}

		this._depenetrate( world );

	}

	// İp kısıtı gibi dışarıdan konum değiştiren adımlardan sonra çağrılır.
	resolve( world ) {

		this._depenetrate( world );

	}

	// Geometrinin içine girildiyse dışarı it. Işınlar tek yüzlü meshlerde
	// her zaman isabet etmediği için bu bir garanti değil, destekleyici önlem.
	_depenetrate( world ) {

		const { radius } = PHYSICS;
		this.getCenter( _origin );

		for ( const dir of PROBE_DIRS ) {

			if ( world.raycast( _origin, dir, radius, _hit2 ) ) {

				const push = radius - _hit2.distance;
				if ( push > 0 ) {

					this.position.x += _hit2.normal.x * push;
					this.position.z += _hit2.normal.z * push;
					_origin.x += _hit2.normal.x * push;
					_origin.z += _hit2.normal.z * push;

				}

			}

		}

	}

	_face( dt, cameraYaw ) {

		const hs = Math.hypot( this.velocity.x, this.velocity.z );
		const target = hs > 0.7
			? Math.atan2( - this.velocity.x, - this.velocity.z )
			: cameraYaw;

		// En kısa yoldan döndür.
		let diff = ( target - this.facing + Math.PI ) % ( Math.PI * 2 ) - Math.PI;
		if ( diff < - Math.PI ) diff += Math.PI * 2;

		this.facing += diff * Math.min( 1, 12 * dt );
		this.object.rotation.y = this.facing;
		this.object.position.copy( this.position );

	}

	// Zemin bulunamayan yerlerde sonsuza düşmeyi engeller.
	checkRespawn( spawnPoint ) {

		if ( this.position.y > PHYSICS.respawnBelow ) return false;

		this.position.copy( spawnPoint );
		this.velocity.set( 0, 0, 0 );
		return true;

	}

	// Zemini bulmak için yukarıdan aşağı ışın atar.
	static findGround( world, x, z, fromHeight ) {

		_probe.set( x, fromHeight, z );
		if ( world.raycast( _probe, DOWN, fromHeight * 2, _hit ) ) return _hit.point;
		return null;

	}

}
