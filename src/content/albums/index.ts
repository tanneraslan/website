import SanFrancisco from './san-francisco.mdx'
import NewYork from './new-york-city.mdx'
import Vancouver from './vancouver.mdx'
import Chicago from './chicago.mdx'
import AnnArbor from './ann-arbor.mdx'
import Boston from './boston.mdx'
import Ephesus from './ephesus.mdx'
import Izmir from './izmir.mdx'
import Zakopane from './zakopane.mdx'
import Krakow from './krakow.mdx'
import KutnaHora from './kutna-hora.mdx'
import Prague from './prague.mdx'

export const albums = [
  { id: 'san-francisco', pinImage: '/san-francisco-bridge.webp', title: 'San Francisco', location: 'California', period: 'May 5–8, 2025',
    latitude: 37.7749, longitude: -122.4194, photos: SanFrancisco, story: '/posts/my-trip-to-sf' },
  { id: 'new-york-city', pinImage: '/new-york-statue-of-liberty.webp', title: 'New York City', location: 'New York', period: 'June 1 – August 25, 2025',
    latitude: 40.7128, longitude: -74.0060, photos: NewYork },
  { id: 'vancouver', pinImage: '/vancouver-lookout.webp', title: 'Vancouver', location: 'British Columbia', period: 'August 9–14, 2025',
    latitude: 49.2827, longitude: -123.1207, photos: Vancouver },
  { id: 'chicago', title: 'Chicago', location: 'Illinois', period: 'September–November 2025',
    latitude: 41.8781, longitude: -87.6298, photos: Chicago, pinImage: '/chicago-cloud-gate.webp' },
  { id: 'ann-arbor', title: 'Ann Arbor', location: 'Michigan', period: '2024–2026',
    latitude: 42.2808, longitude: -83.743, photos: AnnArbor, pinImage: '/ann-arbor-state-theatre.webp' },
  { id: 'boston', title: 'Boston', location: 'Massachusetts', period: 'June–August 2026',
    latitude: 42.3601, longitude: -71.0589, photos: Boston, pinImage: '/boston-citgo-sign.webp' },
  { id: 'ephesus', title: 'Ephesus', location: 'Türkiye', period: 'May 19, 2026',
    latitude: 37.9405, longitude: 27.3414, photos: Ephesus, pinImage: '/ephesus-library-of-celsus.webp' },
  { id: 'izmir', title: 'İzmir', location: 'Türkiye', period: 'May 16–22, 2026',
    latitude: 38.4237, longitude: 27.1428, photos: Izmir, pinImage: '/izmir-clock-tower.webp' },
  { id: 'zakopane', title: 'Zakopane', location: 'Poland', period: 'May 8, 2026',
    latitude: 49.2992, longitude: 19.9496, photos: Zakopane, pinImage: '/zakopane-chalet.webp' },
  { id: 'krakow', title: 'Kraków', location: 'Poland', period: 'May 9–10, 2026',
    latitude: 50.0617, longitude: 19.9373, photos: Krakow, pinImage: '/krakow-st-marys-basilica.webp' },
  { id: 'kutna-hora', title: 'Kutná Hora', location: 'Czechia', period: 'May 5, 2026',
    latitude: 49.948, longitude: 15.268, photos: KutnaHora, pinImage: '/kutna-hora-emblem.webp' },
  { id: 'prague', title: 'Prague', location: 'Czechia', period: 'May 2–11, 2026',
    latitude: 50.0755, longitude: 14.4378, photos: Prague, pinImage: '/prague-tower.webp' },
]
