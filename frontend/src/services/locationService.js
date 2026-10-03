// Device location detection for the CivicLens report flow.
//
// Rules this module enforces:
//  - Coordinates always come from the browser Geolocation API. Nothing is inferred
//    from the IP address and no default coordinate is ever substituted.
//  - A place name is only ever produced by reverse geocoding those coordinates.
//  - When the device cannot supply a fix, the caller is told the real reason so the
//    report can fall back to manual entry instead of claiming a false location.

const GEOCODING_ENDPOINT = import.meta.env.VITE_GEOCODING_ENDPOINT || "https://nominatim.openstreetmap.org";
const GEOCODING_TIMEOUT_MS = 8000;
const FIX_TIMEOUT_MS = 12000;

export const LOCATION_REASONS = {
  UNSUPPORTED: "unsupported",
  DENIED: "denied",
  UNAVAILABLE: "unavailable",
  TIMEOUT: "timeout",
};

export function isGeolocationSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

// "granted" | "denied" | "prompt" | "unsupported" | "unknown"
export async function readPermissionState() {
  if (!isGeolocationSupported()) return "unsupported";
  if (!navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

// Browsers that expose this can re-raise the permission prompt from inside the
// page. Where it is missing, calling getCurrentPosition raises the native prompt.
export async function requestPermission() {
  if (!navigator.permissions?.request) return "unsupported";
  try {
    const status = await navigator.permissions.request({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

function readAddressParts(address = {}) {
  return {
    area:
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.city_district ||
      address.residential ||
      address.road ||
      "",
    city: address.city || address.town || address.village || address.county || "",
    state: address.state || address.region || "",
    country: address.country || "",
  };
}

export function composeLocationLabel({ area, city, state }) {
  return [area, city, state].filter(Boolean).join(", ");
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Geocoding request failed with status ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function reverseGeocode(latitude, longitude) {
  const url = `${GEOCODING_ENDPOINT}/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${latitude}&lon=${longitude}`;
  const payload = await fetchJson(url);
  const parts = readAddressParts(payload.address || {});
  if (!parts.area && !parts.city) throw new Error("No locality was returned for these coordinates.");
  return parts;
}

// Used only for the manual fallback: turns the area a citizen typed into
// coordinates so the report can still appear on the Civic Map.
export async function forwardGeocode(query) {
  const url = `${GEOCODING_ENDPOINT}/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
  const results = await fetchJson(url);
  if (!Array.isArray(results) || !results.length) throw new Error("That area could not be matched to a location.");
  const [first] = results;
  return {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    ...readAddressParts(first.address || {}),
  };
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: FIX_TIMEOUT_MS,
      maximumAge: 0,
    });
  });
}

export async function detectLocation() {
  if (!isGeolocationSupported()) return { ok: false, reason: LOCATION_REASONS.UNSUPPORTED };

  let position;
  try {
    position = await getCurrentPosition();
  } catch (error) {
    if (error?.code === 1) return { ok: false, reason: LOCATION_REASONS.DENIED };
    if (error?.code === 3) return { ok: false, reason: LOCATION_REASONS.TIMEOUT };
    return { ok: false, reason: LOCATION_REASONS.UNAVAILABLE };
  }

  const latitude = Number(position.coords.latitude.toFixed(6));
  const longitude = Number(position.coords.longitude.toFixed(6));
  const accuracy = Math.round(position.coords.accuracy);

  try {
    const place = await reverseGeocode(latitude, longitude);
    return { ok: true, source: "device GPS", latitude, longitude, accuracy, placeLookupFailed: false, ...place };
  } catch {
    // The fix itself is real and verified, only the place-name lookup failed.
    return {
      ok: true,
      source: "device GPS",
      latitude,
      longitude,
      accuracy,
      placeLookupFailed: true,
      area: "",
      city: "",
      state: "",
      country: "",
    };
  }
}
