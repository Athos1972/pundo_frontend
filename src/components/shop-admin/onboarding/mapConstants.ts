export const ZOOM_OVERVIEW = 9   // GPS denied / timeout — country/region overview
export const ZOOM_FALLBACK = 13  // GPS granted but inaccurate (accuracy > 1000m)
export const ZOOM_STREET   = 17  // GPS precise / draft-pin / address search result

export type PinSource = 'click' | 'search' | 'gps' | 'initial' | null
