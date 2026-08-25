// Google'ın 403/400 yanıtlarının GÖVDESİ sebebi açıkça yazar; konsolda görünen
// "error code 403" ise yalnızca durum kodudur.
//
// Gövdeyi eklenti seviyesinde yakalamak işe yaramıyor: ilk hata oturum anahtarı
// isteğinde, GoogleCloudAuth.refreshToken() içindeki ayrı bir fetch'te oluşuyor
// ve orada gövde okunmadan doğrudan Error fırlatılıyor. Bu yüzden teşhis
// fetch seviyesinde yapılıyor — hem oturum isteğini hem karo isteklerini görür.
//
// Sarmalayıcı yanıtı değiştirmez: yalnızca başarısız tile.googleapis.com
// yanıtlarının bir KOPYASINI okur, ilk başarıdan sonra kendini söker.
export function watchGoogleAuthErrors( onAuthError ) {

	const original = window.fetch;
	let finished = false;

	const restore = () => {

		if ( window.fetch === patched ) window.fetch = original;

	};

	const patched = async function ( input, init ) {

		const response = await original.call( this, input, init );

		try {

			if ( ! finished ) {

				// GoogleCloudAuth fetch'e bir URL NESNESİ veriyor (string değil).
				// URL'de `.url` yok, `.href` var; Request'te ise `.url` var.
				const url = toUrlString( input );

				if ( url.includes( 'tile.googleapis.com' ) ) {

					if ( response.ok ) {

						// Bağlantı çalışıyor; teşhise gerek yok.
						finished = true;
						restore();

					} else {

						finished = true;
						const status = response.status;
						response.clone().text().then( text => {

							let message = '';
							try {

								message = JSON.parse( text )?.error?.message || '';

							} catch ( e ) {

								message = ( text || '' ).slice( 0, 300 );

							}

							onAuthError( { status, message, hint: describe( message ) } );

						} ).catch( () => {} ).then( restore );

					}

				}

			}

		} catch ( e ) {

			// Teşhis hiçbir koşulda uygulamanın akışını bozmamalı.
			console.warn( 'auth teşhisi başarısız:', e );

		}

		return response;

	};

	window.fetch = patched;

}

function toUrlString( input ) {

	if ( typeof input === 'string' ) return input;
	if ( input instanceof URL ) return input.href;
	if ( input && typeof input.url === 'string' ) return input.url;
	return '';

}

// Google'ın mesajını uygulanabilir bir yönergeye çevirir.
function describe( message ) {

	const m = String( message );

	if ( /referer|referrer/i.test( m ) ) {

		return 'Anahtarın <b>Websites</b> kısıtı bu alan adını içermiyor. ' +
			'Google Cloud → Credentials → anahtar → Application restrictions ' +
			'bölümüne şu anda açık olan adresi ekleyin. Vercel her önizleme ' +
			'(preview) dağıtımına ayrı bir alan adı verir — üretim adresi ekli ' +
			'olsa bile önizleme adresi engellenir.';

	}

	if ( /quota|exhausted|rate limit|too many/i.test( m ) ) {

		return 'Kota tükenmiş. Cloud Console → APIs &amp; Services → Map Tiles API ' +
			'→ Quotas bölümünden günlük tavanı kontrol edin. Detay seviyesini ' +
			'düşürmek istek sayısını ciddi biçimde azaltır: <code>?detay=20</code>';

	}

	if ( /billing/i.test( m ) ) {

		return 'Projeye etkin bir faturalandırma hesabı bağlı değil. ' +
			'Map Tiles API ücretsiz kotayla bile faturalandırma olmadan çalışmaz.';

	}

	if ( /has not been used|is disabled|not enabled|blocked/i.test( m ) ) {

		return 'Projede <b>Map Tiles API</b> etkin değil. ' +
			'APIs &amp; Services → Library → Map Tiles API → Enable.';

	}

	if ( /API key not valid|API_KEY_INVALID|expired/i.test( m ) ) {

		return 'Anahtar geçersiz. Vercel ortam değişkenini güncelledikten sonra ' +
			'<b>yeniden deploy</b> ettiğinizden emin olun — Vite anahtarı derleme ' +
			'anında gömer, sonradan eklemek eski dağıtımı düzeltmez.';

	}

	if ( /service account/i.test( m ) ) {

		return 'Anahtar bir servis hesabına bağlanmış. Map Tiles API düz API ' +
			'anahtarıyla çalışır; anahtarı servis hesabı olmadan yeniden oluşturun.';

	}

	return 'Yukarıdaki mesajı Google Cloud Console ayarlarınızla karşılaştırın.';

}
