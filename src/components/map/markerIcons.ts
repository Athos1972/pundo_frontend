import L from 'leaflet'

// Brand-konformer SVG-Pin in --color-accent (#D4622A).
// Beide Icons nutzen divIcon mit CSS-Klassen, die in globals.css definiert sind
// (nicht Tailwind-Utilities — die würden aus dynamischen html-Strings herausgepurgt).
const PIN_SVG = (cls: string) =>
  `<div class="${cls}"><svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
  // Teardrop-Körper in Akzentfarbe
  `<path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#D4622A"/>` +
  // Innerer weißer Punkt
  `<circle cx="14" cy="14" r="5.5" fill="white" fill-opacity="0.92"/>` +
  `</svg></div>`

export const defaultMarkerIcon = L.divIcon({
  className: '',
  html: PIN_SVG('pundo-pin'),
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -42],
})

// Highlighted: identischer Pin, größer skaliert + tieferer Schatten via CSS-Klasse.
// Kein Glow-Ring, kein Farbkontrast zur Grundform — Konsistenz über Dramatik.
export const highlightedMarkerIcon = L.divIcon({
  className: '',
  html: PIN_SVG('pundo-pin pundo-pin--active'),
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -42],
})
