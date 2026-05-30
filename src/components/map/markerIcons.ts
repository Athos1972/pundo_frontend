import L from 'leaflet'

const ICON_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const ICON_2X  = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const SHADOW   = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

export const defaultMarkerIcon = L.icon({
  iconUrl: ICON_URL,
  iconRetinaUrl: ICON_2X,
  shadowUrl: SHADOW,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Highlighted marker: same PNG with CSS scale + drop-shadow glow via divIcon.
// Uses --color-accent CSS variable (fallback: #D4622A from globals.css).
// CSS classes (.pundo-marker-highlighted) are defined in globals.css — not Tailwind
// utilities — so they survive the Tailwind compiler purge of dynamic html strings.
export const highlightedMarkerIcon = L.divIcon({
  className: '',
  html: `<div class="pundo-marker-highlighted"><img src="${ICON_URL}" width="25" height="41" /></div>`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
