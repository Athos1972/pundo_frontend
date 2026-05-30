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
// Inline styles are required inside Leaflet divIcon html strings — Tailwind purges
// class-based styles that only appear in dynamic html strings.
export const highlightedMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:25px;height:41px"><img src="${ICON_URL}" width="25" height="41" style="transform:scale(1.35);transform-origin:50% 100%;filter:drop-shadow(0 0 7px var(--color-accent,#D4622A)) drop-shadow(0 0 3px var(--color-accent,#D4622A));transition:transform 0.15s,filter 0.15s" /></div>`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
