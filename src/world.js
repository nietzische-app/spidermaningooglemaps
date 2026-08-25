import {
	AmbientLight,
	BoxGeometry,
	DirectionalLight,
	Color,
	Fog,
	HemisphereLight,
	MathUtils,
	Mesh,
	MeshLambertMaterial,
	Group,
	PlaneGeometry,
	Raycaster,
	Vector3,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { TilesRenderer } from '3d-tiles-renderer';
import { TILES } from './config.js';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/core/plugins';
import {
	GLTFExtensionsPlugin,
	ReorientationPlugin,
	TileCompressionPlugin,
	TilesFadePlugin,
} from '3d-tiles-renderer/plugins';

const _dir = new Vector3();

export function makeHit() {

	return { point: new Vector3(), normal: new Vector3(), distance: 0, object: null };

}

export class World {

	constructor( scene ) {

		this.scene = scene;
		this.tiles = null;
		this.collider = null;      // ışın atılacak kök nesne
		this.isMock = false;
		this.anyTileLoaded = false;
		this.onError = null;

		this.raycaster = new Raycaster();

		// Ne Google karoları ne de prova şehri gökyüzü içerir; arka plan
		// rengi olmadan ufuk siyah kalıyor.
		this.skyColor = new Color( 0x93aec9 );
		scene.background = this.skyColor;

		this._addLights();

	}

	_addLights() {

		// Google karolarının dokuları zaten ışıklandırılmış geldiği için
		// güçlü bir ortam ışığı + yumuşak yön ışığı yeterli.
		this.scene.add( new AmbientLight( 0xffffff, 2.2 ) );

		const hemi = new HemisphereLight( 0xbcd8ff, 0x40404a, 1.2 );
		this.scene.add( hemi );

		const sun = new DirectionalLight( 0xffffff, 1.4 );
		sun.position.set( 120, 260, 90 );
		this.scene.add( sun );

	}

	/**
	 * Google Photorealistic 3D Tiles. ReorientationPlugin, seçilen enlem/boylamı
	 * sahnenin orijinine taşıyıp +Y'yi yukarı çevirir — böylece fizik, ECEF
	 * koordinatlarında (dünya merkezinden ~6.3 milyon metre uzakta, yerçekimi
	 * eğik) değil, sıradan bir yerel oyun uzayında çalışır.
	 */
	initTiles( apiKey, location, errorTarget = TILES.errorTarget ) {

		const tiles = new TilesRenderer();
		this.tiles = tiles;

		// useRecommendedSettings kapalı: bu seçenek errorTarget'ı sessizce 20
		// yapıyor. Değeri aşağıda kendimiz belirliyoruz.
		tiles.registerPlugin( new GoogleCloudAuthPlugin( {
			apiToken: apiKey,
			autoRefreshToken: true,
			useRecommendedSettings: false,
		} ) );
		tiles.registerPlugin( new GLTFExtensionsPlugin( { dracoLoader: new DRACOLoader() } ) );
		tiles.registerPlugin( new TileCompressionPlugin() );
		tiles.registerPlugin( new TilesFadePlugin() );
		tiles.registerPlugin( new ReorientationPlugin( {
			lat: MathUtils.degToRad( location.lat ),
			lon: MathUtils.degToRad( location.lon ),
			height: 0,
		} ) );

		tiles.addEventListener( 'load-model', () => {

			this.anyTileLoaded = true;

		} );

		tiles.addEventListener( 'load-error', ( { error } ) => {

			console.error( '3D Tiles yüklenemedi:', error );
			if ( ! this.anyTileLoaded && this.onError ) this.onError( error );

		} );

		// Eklentiler init() sırasında errorTarget'a dokunabildiği için bunu
		// kayıtlardan SONRA ayarlıyoruz.
		tiles.errorTarget = errorTarget;

		this.scene.add( tiles.group );
		this.collider = tiles.group;

		return this;

	}

	/**
	 * API anahtarı yokken (ya da ?mock=1 ile) kullanılan prosedürel şehir.
	 * Mekanikleri Google kotası harcamadan geliştirmek/denemek için.
	 */
	initMock() {

		this.isMock = true;
		this.scene.fog = new Fog( this.skyColor.getHex(), 250, 1500 );

		const city = new Group();
		city.name = 'MockCity';

		const ground = new Mesh(
			new PlaneGeometry( 2000, 2000 ),
			new MeshLambertMaterial( { color: 0x2a2f38 } )
		);
		ground.rotation.x = - Math.PI / 2;
		city.add( ground );

		// Deterministik sözde-rastgele: her açılışta aynı şehir.
		let seed = 1337;
		const rand = () => {

			seed = ( seed * 1664525 + 1013904223 ) % 4294967296;
			return seed / 4294967296;

		};

		const geometry = new BoxGeometry( 1, 1, 1 );
		const palette = [ 0x4a5364, 0x3d4552, 0x566072, 0x333a45 ];
		const spacing = 46;

		for ( let ix = - 9; ix <= 9; ix ++ ) {

			for ( let iz = - 9; iz <= 9; iz ++ ) {

				// Başlangıç noktasının çevresini boş bırak.
				if ( Math.abs( ix ) < 1 && Math.abs( iz ) < 1 ) continue;

				const h = 25 + rand() * 150;
				const w = 16 + rand() * 14;
				const d = 16 + rand() * 14;

				const b = new Mesh(
					geometry,
					new MeshLambertMaterial( { color: palette[ Math.floor( rand() * palette.length ) ] } )
				);
				b.scale.set( w, h, d );
				b.position.set(
					ix * spacing + ( rand() - 0.5 ) * 10,
					h / 2,
					iz * spacing + ( rand() - 0.5 ) * 10
				);
				city.add( b );

			}

		}

		this.scene.add( city );
		this.collider = city;
		this.anyTileLoaded = true;

		return this;

	}

	/**
	 * Tek ışın. Bulursa `target`'ı doldurup döndürür, bulamazsa null.
	 * Yüzey normali dünya uzayına çevrilir.
	 */
	raycast( origin, direction, maxDistance, target ) {

		if ( ! this.collider ) return null;

		_dir.copy( direction ).normalize();

		const raycaster = this.raycaster;
		raycaster.set( origin, _dir );
		raycaster.near = 0;
		raycaster.far = maxDistance;

		const hits = raycaster.intersectObject( this.collider, true );
		if ( hits.length === 0 ) return null;

		const hit = hits[ 0 ];
		target.point.copy( hit.point );
		target.distance = hit.distance;
		target.object = hit.object;

		if ( hit.face ) {

			target.normal
				.copy( hit.face.normal )
				.transformDirection( hit.object.matrixWorld )
				.normalize();

		} else {

			target.normal.copy( _dir ).negate();

		}

		// Işınla aynı yöne bakan normalleri ters çevir (arka yüzler).
		if ( target.normal.dot( _dir ) > 0 ) target.normal.negate();

		return target;

	}

	update( camera, renderer ) {

		if ( ! this.tiles ) return;

		this.tiles.setResolutionFromRenderer( camera, renderer );
		this.tiles.update();

	}

	// Kaç karo görünür durumda — detayın gelip gelmediğinin göstergesi.
	get visibleTileCount() {

		return this.tiles ? this.tiles.visibleTiles.size : 0;

	}

	getAttributions( target ) {

		if ( ! this.tiles ) return target;
		this.tiles.getAttributions( target );
		return target;

	}

}
