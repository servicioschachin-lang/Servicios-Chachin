/**
 * Proxy seguro hacia Google Places API (New) Place Details.
 * Netlify → Environment variables: GOOGLE_MAPS_API_KEY, GOOGLE_PLACE_ID
 * Opcional: REVIEWS_LIMIT (1-5; la API devuelve como máximo 5 reseñas).
 *
 * Cumplimiento: revisa términos, facturación (SKU con campo reviews) y políticas
 * de caché en https://cloud.google.com/maps-platform/terms
 */

const PLACES_BASE = "https://places.googleapis.com/v1/places";

function normalizePlaceId(raw) {
  let id = (raw || "").trim();
  if (id.startsWith("places/")) id = id.slice("places/".length);
  return id;
}

function parseTimeMs(review) {
  if (review.publishTime) {
    const t = Date.parse(review.publishTime);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function authorFromReview(r) {
  const name = r.authorAttribution && r.authorAttribution.displayName;
  if (name) return name;
  return "Usuario de Google";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const placeId = normalizePlaceId(process.env.GOOGLE_PLACE_ID);
  let limit = parseInt(process.env.REVIEWS_LIMIT || "5", 10);
  if (Number.isNaN(limit) || limit < 1) limit = 5;
  limit = Math.min(limit, 5);

  if (!apiKey || !placeId) {
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "missing_config",
        message: "Configure GOOGLE_MAPS_API_KEY and GOOGLE_PLACE_ID in Netlify.",
        reviews: [],
      }),
    };
  }

  const url = `${PLACES_BASE}/${encodeURIComponent(placeId)}`;
  const fieldMask = "reviews,rating,googleMapsUri,displayName";

  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    });
  } catch {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: "fetch_failed", reviews: [] }),
    };
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: "invalid_response", reviews: [] }),
    };
  }

  if (!res.ok) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "places_api_error",
        status: res.status,
        detail:
          (data.error && data.error.message) || text.slice(0, 400),
        reviews: [],
      }),
    };
  }

  let reviews = Array.isArray(data.reviews) ? data.reviews.slice() : [];
  reviews.sort((a, b) => parseTimeMs(b) - parseTimeMs(a));
  reviews = reviews.slice(0, limit);

  const displayName =
    data.displayName && data.displayName.text ? data.displayName.text : null;

  const payload = {
    placeRating: data.rating != null ? data.rating : null,
    displayName,
    googleMapsUri: data.googleMapsUri || null,
    reviews: reviews.map((r) => ({
      rating: r.rating != null ? r.rating : null,
      text:
        (r.text && r.text.text) ||
        (r.originalText && r.originalText.text) ||
        "",
      author: authorFromReview(r),
      authorUri:
        r.authorAttribution && r.authorAttribution.uri
          ? r.authorAttribution.uri
          : null,
      relativeTime: r.relativePublishTimeDescription || null,
      publishTime: r.publishTime || null,
    })),
    attribution:
      "Reseñas y valoraciones mostradas según los datos disponibles en Google Maps. Las opiniones son de usuarios de Google.",
  };

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=900",
    },
    body: JSON.stringify(payload),
  };
};
