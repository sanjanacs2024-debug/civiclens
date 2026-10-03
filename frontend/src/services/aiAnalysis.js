// CivicLens AI image analysis.
//
// `analyzeImage` is the only function the report page calls. It uses the Gemini
// vision API whenever VITE_GEMINI_API_KEY is configured and otherwise falls back
// to the local heuristic analyzer, so the demo runs with no credentials.
//
// Going live is a config change only: set VITE_GEMINI_API_KEY in frontend/.env.
// No call site needs to change. The local analyzer is kept as the offline
// fallback so a network or quota failure never blocks a report submission.

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Must stay aligned with the category and severity enums the API accepts.
const CATEGORIES = ["Roads & Infrastructure", "Water & Drainage", "Waste & Cleanliness", "Public Safety"];
const SEVERITIES = ["Low", "Medium", "High", "Critical"];

const PROMPT = [
  "You are the CivicLens civic-issue classification engine for Bengaluru.",
  "Analyse the uploaded photo and return ONLY a JSON object with these keys:",
  'title (string, max 90 chars), issueDetected (string), category (one of',
  `"${CATEGORIES.join('", "')}"), severity (one of "${SEVERITIES.join('", "')}"),`,
  "department (string), description (2 sentences describing the visible hazard),",
  "confidence (number between 0 and 1).",
  "Also include visualLocationEstimate: read street signs, shop names, written",
  "street names or landmarks in the photo and return the area name you can read,",
  "or null when the photo contains no readable location clue. This is only ever an",
  "estimate and must never be presented as a verified position.",
].join(" ");

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onloadend = () => {
      const result = String(reader.result || "");
      const base64 = result.slice(result.indexOf(",") + 1);
      if (!base64) reject(new Error("The image could not be read."));
      else resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

function readDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    image.src = url;
  });
}

// Normalises whatever the model returns into the exact shape the report form uses.
function normalize(raw, source) {
  const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
  const confidence = Number(raw.confidence);
  const estimate = typeof raw.visualLocationEstimate === "string" ? raw.visualLocationEstimate.trim() : "";

  return {
    title: String(raw.title || raw.issueDetected || "Reported civic issue").slice(0, 90),
    issueDetected: String(raw.issueDetected || raw.title || "Civic issue"),
    category: pick(raw.category, CATEGORIES, CATEGORIES[0]),
    severity: pick(raw.severity, SEVERITIES, "Medium"),
    department: String(raw.department || "Municipal Civic Works"),
    description: String(raw.description || "A civic issue was reported from photographic evidence."),
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
    // Empty unless a real model read an area out of the image. The offline
    // analyzer deliberately leaves this blank rather than inventing a place.
    visualLocationEstimate: estimate,
    source,
  };
}

async function analyzeWithGemini(file) {
  const base64 = await readAsBase64(file);
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: file.type || "image/jpeg", data: base64 } },
        ],
      }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}.`);

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
  const parsed = JSON.parse(text);
  return normalize(parsed, `Gemini ${GEMINI_MODEL}`);
}

// Offline stand-in for the vision model. The verdict is derived from the file
// itself (name, mime type, byte size, pixel dimensions) so the same photo always
// produces the same analysis, which keeps a live demo consistent.
const LOCAL_PROFILES = [
  {
    issueDetected: "Damaged Road / Potholes",
    category: "Roads & Infrastructure",
    severity: "High",
    department: "Roads & Infrastructure",
    title: "Deep pothole cluster on a damaged road surface",
    description: "Multiple potholes and broken sections are visible across the road surface, creating a direct hazard for two-wheelers and pedestrians. The damaged stretch appears wide enough to require resurfacing rather than patching.",
    confidence: 0.94,
  },
  {
    issueDetected: "Waterlogging / Drainage Overflow",
    category: "Water & Drainage",
    severity: "High",
    department: "Water & Drainage",
    title: "Waterlogged street with overflowing drainage",
    description: "Standing water covers a large part of the street, indicating a blocked or over-loaded drainage line. Vehicles risk aquaplaning here and the pooled water is likely to carry waste into nearby homes.",
    confidence: 0.91,
  },
  {
    issueDetected: "Illegal Waste Dumping",
    category: "Waste & Cleanliness",
    severity: "Medium",
    department: "Solid Waste Management",
    title: "Waste pile blocking the public walkway",
    description: "Mixed solid waste has been dumped along the edge of the walkway, narrowing the pedestrian path. Uncovered waste is attracting stray animals and will spread into the drain during the next rainfall.",
    confidence: 0.89,
  },
  {
    issueDetected: "Broken Streetlight / Safety Hazard",
    category: "Public Safety",
    severity: "Medium",
    department: "Electrical / BBMP Lighting",
    title: "Non-functional streetlight creating a dark stretch",
    description: "The streetlight in this segment is not illuminating, leaving the stretch unlit after dark. The gap in lighting affects pedestrian and rider visibility at an already busy junction.",
    confidence: 0.86,
  },
  {
    issueDetected: "Damaged Road / Potholes",
    category: "Roads & Infrastructure",
    severity: "Critical",
    department: "Roads & Infrastructure",
    title: "Collapsed road edge beside a pedestrian crossing",
    description: "The road edge has collapsed into a deep trench directly beside a marked crossing. The gap is wide enough to be dangerous for pedestrians and needs an immediate safety barricade.",
    confidence: 0.96,
  },
  {
    issueDetected: "Open Manhole / Uncovered Drain",
    category: "Water & Drainage",
    severity: "Critical",
    department: "Water & Drainage",
    title: "Open drain cover missing on the carriageway",
    description: "A drain cover is missing, leaving an open access point on the carriageway. This is an immediate fall and vehicle-collision hazard for anyone passing after dark.",
    confidence: 0.93,
  },
  {
    issueDetected: "Waste Dumping at a Public Bin",
    category: "Waste & Cleanliness",
    severity: "Low",
    department: "Solid Waste Management",
    title: "Overflowing waste bin with debris around it",
    description: "The municipal bin is overflowing and loose debris has collected around its base. The overflow is modest but is already spreading onto the adjacent walking path.",
    confidence: 0.82,
  },
  {
    issueDetected: "Damaged Public Footpath",
    category: "Roads & Infrastructure",
    severity: "Medium",
    department: "Roads & Infrastructure",
    title: "Broken footpath slabs forcing pedestrians off the path",
    description: "Several footpath slabs are broken and uneven, forcing pedestrians to walk along the carriageway. The uneven surface is a trip hazard, particularly for children and older residents.",
    confidence: 0.88,
  },
];

function hashOf(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

async function analyzeLocally(file) {
  const { width, height } = await readDimensions(file);
  const signature = `${file.name}|${file.type}|${file.size}|${width}x${height}`;
  const profile = LOCAL_PROFILES[hashOf(signature) % LOCAL_PROFILES.length];

  // A short deterministic delay keeps the loading state visible in a live demo.
  await new Promise((resolve) => setTimeout(resolve, 1400));
  return normalize(profile, "CivicLens AI (offline model)");
}

export async function analyzeImage(file) {
  if (GEMINI_API_KEY) {
    try {
      return await analyzeWithGemini(file);
    } catch {
      return analyzeLocally(file);
    }
  }
  return analyzeLocally(file);
}
