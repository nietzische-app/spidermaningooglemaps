import {
	BufferGeometry,
	Line,
	LineBasicMaterial,
	Mesh,
	MeshBasicMaterial,
	SphereGeometry,
	Vector3,
} from 'three';
import { SWING } from './config.js';
import { makeHit } from './world.js';

const _center = new Vector3();
const _toAnchor = new Vector3();
const _dir = new Vector3();
const _tangent = new Vector3();
const _camDir = new Vector3();
const _hit = makeHit();

export class Swing {

	constructor( scene ) {

		this.attached = false;
		this.anchor = new Vector3();
		this.ropeLength = 0;
		this.minLength = SWING.minRopeLength;
		this._stallTimer = 0;

		const geometry = new BufferGeometry().setFromPoints( [ new Vector3(), new Vector3() ] );
		this.line = new Line( geometry, new LineBasicMaterial( { color: SWING.ropeColor } ) );
		this.line.frustumCulled = false;   // uçları her kare elle güncelleniyor
		this.line.visible = false;
		scene.add( this.line );

		this.marker = new Mesh(
			new SphereGeometry( 0.55, 10, 8 ),
			new MeshBasicMaterial( { color: SWING.ropeColor } )
		);
		this.marker.visible = false;
		scene.add( this.marker );

	}

	/**
	 * Nişangahtan (ekran merkezi = kameranın baktığı yön) ışın atar.
	 * Tutunma noktası karakterin üstünde olmalı, yoksa sarkaç yerine
	 * kendini zemine çekersin.
	 */
	tryAttach( camera, world, player ) {

		camera.getWorldDirection( _camDir );
		player.getCenter( _center );

		// Işın kameradan değil karakterden çıkar: kamera karaktere baktığı için
		// kameradan atılan ışın önce karakterin içinden geçer ve yanlış noktayı
		// bulur. Yön kameranın bakış yönü, kaynak karakterin merkezi.
		if ( ! world.raycast( _center, _camDir, SWING.maxRange, _hit ) ) return false;

		if ( _hit.point.y < player.position.y + 3 ) return false;

		this.anchor.copy( _hit.point );
		// Biraz kısa bağla ki anında gerilsin.
		this.ropeLength = Math.max( SWING.minRopeLength, _center.distanceTo( this.anchor ) * 0.95 );
		this.minLength = Math.max( SWING.minRopeLength, this.ropeLength * SWING.minRopeFactor );
		this._stallTimer = 0;
		this.attached = true;

		this.line.visible = true;
		this.marker.visible = true;
		this.marker.position.copy( this.anchor );

		return true;

	}

	release( player ) {

		if ( ! this.attached ) return;

		this.attached = false;
		this.line.visible = false;
		this.marker.visible = false;

		// Sarkaçtan kazanılan teğetsel hız zaten ileri fırlatıyor;
		// bu küçük ek yukarı itiş "bırakıp havalanma" hissini veriyor.
		player.velocity.y += SWING.releaseBoost;

	}

	/**
	 * Konum tabanlı (PBD) ip kısıtı: karakter ipin izin verdiği küresel
	 * yüzeyin dışına çıkarsa geri çekilir ve merkezden uzaklaşan hız
	 * bileşeni silinir. Kalan teğetsel hız = sarkaç salınımı.
	 */
	applyConstraint( player, dt, input ) {

		if ( ! this.attached ) return;

		player.getCenter( _center );
		_toAnchor.subVectors( this.anchor, _center );
		const dist = _toAnchor.length();

		if ( dist < 1e-4 ) return;

		// Sol tık basılı tutuldukça ipi yavaşça topla: yukarı ve ileri ivme verir.
		this.ropeLength = Math.max( this.minLength, this.ropeLength - SWING.reelSpeed * dt );

		if ( dist > SWING.maxRange * 1.6 ) {

			this.release( player );
			return;

		}

		// Duvara sıkışma tespiti: bağlıyken neredeyse hiç hareket yoksa ağı kopar,
		// yoksa karakter yüzeye yapışıp asılı kalır.
		if ( player.velocity.lengthSq() < SWING.stallSpeed * SWING.stallSpeed ) {

			this._stallTimer += dt;
			if ( this._stallTimer > SWING.stallTime ) {

				this.release( player );
				return;

			}

		} else {

			this._stallTimer = 0;

		}

		_dir.copy( _toAnchor ).divideScalar( dist );   // karakterden çapaya doğru

		if ( dist > this.ropeLength ) {

			const correction = dist - this.ropeLength;
			player.position.addScaledVector( _dir, correction );

			// Çapadan uzaklaşan (radyal) bileşeni sıfırla, teğetseli koru.
			const vr = player.velocity.dot( _dir );
			if ( vr < 0 ) player.velocity.addScaledVector( _dir, - vr );

		}

		// W ile salınımı pompala: kamera yönünün ipe dik bileşeni.
		if ( input.isDown( 'KeyW' ) ) {

			_tangent.copy( _camDir ).addScaledVector( _dir, - _camDir.dot( _dir ) );
			if ( _tangent.lengthSq() > 1e-6 ) {

				_tangent.normalize();
				player.velocity.addScaledVector( _tangent, SWING.assist * dt );

			}

		}

		player.grounded = false;

	}

	// Kamera yönünü her kare sakla (pompalama teğeti için).
	syncCameraDirection( camera ) {

		camera.getWorldDirection( _camDir );

	}

	updateVisual( player ) {

		if ( ! this.attached ) return;

		player.getCenter( _center );

		const positions = this.line.geometry.attributes.position;
		positions.setXYZ( 0, _center.x, _center.y, _center.z );
		positions.setXYZ( 1, this.anchor.x, this.anchor.y, this.anchor.z );
		positions.needsUpdate = true;

	}

}
