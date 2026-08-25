// Ekran arayüzü: nişangah, durum kartı, telemetri ve telif satırı.
export class Hud {

	constructor() {

		this.crosshair = document.getElementById( 'crosshair' );
		this.overlay = document.getElementById( 'overlay' );
		this.overlayBody = document.getElementById( 'overlay-body' );
		this.place = document.getElementById( 'place' );
		this.telemetry = document.getElementById( 'telemetry' );
		this.attribution = document.getElementById( 'attribution' );

		this._overlayPriority = - 1;
		this._lastAttribution = '';
		this._lastTelemetry = '';

	}

	setPlace( text ) {

		this.place.textContent = text;

	}

	// priority: daha yüksek olan daha düşüğü ezebilir. Genel "yüklenemedi"
	// mesajı 0, Google'ın gerçek sebebi 1 — hangisi önce gelirse gelsin
	// ekranda anlamlı olan kalır.
	showOverlay( html, priority = 0 ) {

		if ( priority < this._overlayPriority ) return;

		this._overlayPriority = priority;
		this.overlayBody.innerHTML = html;
		this.overlay.hidden = false;

	}

	hideOverlay() {

		this._overlayPriority = - 1;
		this.overlay.hidden = true;

	}

	setSwinging( active ) {

		this.crosshair.classList.toggle( 'active', active );

	}

	setTelemetry( player, swinging, spawned, tileCount = 0 ) {

		let state = 'Havada';
		if ( swinging ) state = 'Salınım';
		else if ( ! spawned ) state = 'Zemin aranıyor';
		else if ( player.grounded ) state = 'Zeminde';

		const kmh = Math.round( player.velocity.length() * 3.6 );
		const tiles = tileCount > 0 ? ` · ${ tileCount } karo` : '';
		const text = `${ state } · ${ kmh } km/s · ${ Math.round( player.position.y ) } m${ tiles }`;

		if ( text !== this._lastTelemetry ) {

			this._lastTelemetry = text;
			this.telemetry.textContent = text;

		}

	}

	setAttribution( items ) {

		const text = items
			.filter( item => item.type === 'string' )
			.map( item => item.value )
			.join( ' · ' );

		if ( text !== this._lastAttribution ) {

			this._lastAttribution = text;
			this.attribution.textContent = text;

		}

	}

}
