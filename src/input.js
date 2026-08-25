// Klavye + fare durumu. Kamera için pointer lock kullanılıyor: fare imleci
// kilitlenince hareket ettirmek doğrudan kamerayı döndürür.
export class Input {

	constructor( domElement ) {

		this.domElement = domElement;
		this.keys = new Set();
		this.justPressed = new Set();
		this.mouseDX = 0;
		this.mouseDY = 0;
		this.leftDown = false;
		this.leftPressed = false;
		this.leftReleased = false;
		this.locked = false;
		this.onLockChange = null;

		this._bind();

	}

	_bind() {

		window.addEventListener( 'keydown', e => {

			// Space sayfayı kaydırmasın.
			if ( e.code === 'Space' ) e.preventDefault();
			if ( ! e.repeat ) this.justPressed.add( e.code );
			this.keys.add( e.code );

		} );

		window.addEventListener( 'keyup', e => this.keys.delete( e.code ) );

		// Sekmeden çıkınca tuşlar basılı kalmasın.
		window.addEventListener( 'blur', () => this.reset() );

		this.domElement.addEventListener( 'mousedown', e => {

			if ( ! this.locked ) {

				// İlk tıklama yalnızca imleci kilitler, ağ atmaz.
				this.domElement.requestPointerLock();
				return;

			}

			if ( e.button === 0 ) {

				this.leftDown = true;
				this.leftPressed = true;

			}

		} );

		window.addEventListener( 'mouseup', e => {

			if ( e.button === 0 && this.leftDown ) {

				this.leftDown = false;
				this.leftReleased = true;

			}

		} );

		document.addEventListener( 'mousemove', e => {

			if ( ! this.locked ) return;
			this.mouseDX += e.movementX;
			this.mouseDY += e.movementY;

		} );

		document.addEventListener( 'pointerlockchange', () => {

			this.locked = document.pointerLockElement === this.domElement;
			if ( ! this.locked ) this.reset();
			if ( this.onLockChange ) this.onLockChange( this.locked );

		} );

	}

	reset() {

		this.keys.clear();
		this.justPressed.clear();
		this.mouseDX = 0;
		this.mouseDY = 0;
		if ( this.leftDown ) this.leftReleased = true;
		this.leftDown = false;

	}

	isDown( code ) {

		return this.keys.has( code );

	}

	wasPressed( code ) {

		return this.justPressed.has( code );

	}

	// Her karenin sonunda çağrılır: anlık (edge) girdiler tüketilir.
	endFrame() {

		this.justPressed.clear();
		this.mouseDX = 0;
		this.mouseDY = 0;
		this.leftPressed = false;
		this.leftReleased = false;

	}

}
