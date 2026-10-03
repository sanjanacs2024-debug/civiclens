import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  MapPinOff,
  CheckCircle2,
  Camera,
  Sparkles,
  Wand2,
  Building2,
  Navigation,
  PencilLine,
  AlertTriangle,
  X
} from "lucide-react";
import { apiService, ISSUES_CHANGED_EVENT } from "../services/api";
import { analyzeImage } from "../services/aiAnalysis";
import {
  LOCATION_REASONS,
  composeLocationLabel,
  detectLocation,
  forwardGeocode,
  readPermissionState,
  requestPermission
} from "../services/locationService";
import Navbar from "../components/Navbar";

const CATEGORIES = [
  "Roads & Infrastructure",
  "Waste & Cleanliness",
  "Water & Drainage",
  "Public Safety",
  "Other"
];

export default function Report() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    location: "",
    latitude: "",
    longitude: "",
    area: "",
    city: "",
    state: "",
    country: "",
    locationSource: "",
    responsibleDepartment: "",
    severity: "Medium",
    reporterName: "Arjun Sharma"
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submittedIssue, setSubmittedIssue] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [aiStatus, setAiStatus] = useState("idle");
  const [aiResult, setAiResult] = useState(null);
  const analysisRunRef = useRef(0);

  // "idle" | "checking" | "detecting" | "detected" | "needs-action" |
  // "denied" | "unavailable" | "timeout" | "unsupported"
  const [locationStatus, setLocationStatus] = useState("checking");
  const [locationInfo, setLocationInfo] = useState(null);
  const [manualLocation, setManualLocation] = useState(false);
  const locationRunRef = useRef(0);
  const locationInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      if (name !== "location") return { ...prev, [name]: value };

      // Typing an area is an explicit manual choice. Any coordinates we invented
      // earlier are dropped, but a verified device fix is kept as the primary source.
      const keepVerifiedFix = prev.locationSource === "device GPS" && prev.latitude && prev.longitude;
      return {
        ...prev,
        location: value,
        locationSource: "manual",
        ...(keepVerifiedFix
          ? {}
          : { area: "", city: "", state: "", country: "", latitude: "", longitude: "" }),
      };
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const resetAnalysis = () => {
    analysisRunRef.current += 1;
    setAiStatus("idle");
    setAiResult(null);
  };

  // Runs the CivicLens AI pass over the evidence photo and pre-fills the report
  // fields that are still empty, so the citizen never has to retype what the
  // model already read from the image. Anything typed first is left untouched.
  const runAnalysis = async (file) => {
    const runId = analysisRunRef.current + 1;
    analysisRunRef.current = runId;
    setAiStatus("analyzing");
    setAiResult(null);

    try {
      const result = await analyzeImage(file);
      if (analysisRunRef.current !== runId) return;
      setAiResult(result);
      setAiStatus("done");
      setFormData((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : result.title,
        category: CATEGORIES.includes(result.category) ? result.category : prev.category,
        severity: result.severity || prev.severity,
        description: prev.description.trim() ? prev.description : result.description,
        responsibleDepartment: result.department || prev.responsibleDepartment,
      }));
    } catch {
      if (analysisRunRef.current !== runId) return;
      setAiStatus("error");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: "Image size must be less than 5MB" }));
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        setErrors((prev) => ({ ...prev, image: "Use a JPG, PNG, WEBP, or GIF image." }));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageFile(file);
        setErrors((prev) => ({ ...prev, image: null }));
        runAnalysis(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const runLocationDetection = useCallback(async () => {
    const runId = locationRunRef.current + 1;
    locationRunRef.current = runId;
    setLocationStatus("detecting");

    const result = await detectLocation();
    if (locationRunRef.current !== runId) return;

    if (!result.ok) {
      setLocationStatus(result.reason);
      return;
    }

    setLocationInfo(result);
    setLocationStatus("detected");
    setManualLocation(false);

    // When the fix is good but the place-name lookup failed, fall back to the
    // coordinates themselves. That keeps the required location field filled with
    // something truthful instead of blocking the submit or inventing an area.
    const label = composeLocationLabel(result)
      || `${result.latitude}, ${result.longitude}`;

    setFormData((prev) => ({
      ...prev,
      latitude: String(result.latitude),
      longitude: String(result.longitude),
      area: result.area,
      city: result.city,
      state: result.state,
      country: result.country,
      locationSource: "device GPS",
      location: prev.location.trim() || label,
    }));

    setErrors((prev) => (prev.location ? { ...prev, location: null } : prev));
  }, []);

  // "Turn On Location": ask the browser to re-raise the prompt where that API
  // exists, then request a fix. A browser cannot open the operating system's GPS
  // settings, so the panel also spells out the manual device steps instead of
  // pretending the hardware was switched on.
  const handleTurnOnLocation = async () => {
    await requestPermission();
    await runLocationDetection();
  };

  const handleManualLocation = () => {
    setManualLocation(true);
    setLocationStatus("idle");
    locationInputRef.current?.focus();
  };

  // Manual fallback: resolve the typed area to coordinates so the report can still
  // be pinned on the Civic Map. Recorded as "manual", never as a device fix.
  const applyManualGeocode = async () => {
    const query = formData.location.trim();
    if (!query) return;

    try {
      const place = await forwardGeocode(query);
      setFormData((prev) => ({
        ...prev,
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        area: prev.area || place.area,
        city: prev.city || place.city,
        state: prev.state || place.state,
        locationSource: "manual",
      }));
    } catch {
      setFormData((prev) => ({ ...prev, latitude: "", longitude: "" }));
    }
  };

  // Check permission once when the report opens. When access is already granted
  // we detect silently, so uploading a photo never re-asks for permission.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const permission = await readPermissionState();
      if (cancelled) return;

      if (permission === "granted") {
        runLocationDetection();
        return;
      }
      if (permission === "denied") {
        setLocationStatus(LOCATION_REASONS.DENIED);
        return;
      }
      if (permission === "unsupported") {
        setLocationStatus(LOCATION_REASONS.UNSUPPORTED);
        return;
      }
      setLocationStatus("needs-action");
    })();

    return () => {
      cancelled = true;
    };
  }, [runLocationDetection]);

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.location.trim()) newErrors.location = "Location area is required";
    if (!imageFile) newErrors.image = "Evidence photo is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setSubmitError("");
    try {
      // A manually typed area with no coordinates yet gets one last lookup so the
      // report can still be pinned on the Civic Map.
      if (formData.locationSource === "manual" && !formData.latitude) {
        await applyManualGeocode();
      }

      const response = await apiService.createIssue({
        ...formData,
        image: imageFile,
      });

      if (response.success) {
        setSubmittedIssue(response.data);
        // Tell any open Civic Map that the register changed so it refetches
        // instead of waiting for a manual reload.
        window.dispatchEvent(new CustomEvent(ISSUES_CHANGED_EVENT));
      } else {
        setSubmitError(response.error || "Unable to submit the civic issue.");
      }
    } catch {
      setSubmitError("Unable to connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

// A report is only pinned on the Civic Map when it carries real coordinates.
  const hasMapCoordinates = Boolean(submittedIssue)
    && submittedIssue.latitude !== null && submittedIssue.latitude !== undefined && submittedIssue.latitude !== ""
    && submittedIssue.longitude !== null && submittedIssue.longitude !== undefined && submittedIssue.longitude !== "";

  return (
    <div className="min-h-screen bg-[#e7fff2] text-[#102c20]">

      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-10">

        {submittedIssue ? (
          <div className="rounded-3xl border border-[#006c49]/20 bg-white p-8 shadow-xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#006c49] text-white">
              <CheckCircle2 size={36} />
            </div>

            <h2 className="mt-4 text-3xl font-black text-[#102c20]">
              Your civic issue has been reported.
            </h2>
            <p className="mt-2 text-sm text-[#1b6b51]">
              CivicLens telemetry has logged your evidence and calculated AI priority metrics.
            </p>

            <div className="mt-6 rounded-2xl border border-[#006c49]/10 bg-[#e7fff2]/50 p-6 text-left space-y-3">
              <div className="flex justify-between text-xs font-bold border-b pb-2 text-[#006c49]">
                <span>ISSUE TELEMETRY ID</span>
                <span>{submittedIssue.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-500">Title:</span>
                <span className="font-bold text-[#102c20]">{submittedIssue.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-500">Category:</span>
                <span className="font-bold text-[#102c20]">{submittedIssue.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-500">Location:</span>
                <span className="font-bold text-[#102c20]">{submittedIssue.location}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-500">Severity:</span>
                <span className="font-bold text-[#102c20]">{submittedIssue.severity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-500">Responsible department:</span>
                <span className="font-bold text-[#102c20]">{submittedIssue.department}</span>
              </div>
              {hasMapCoordinates && (
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-500">Pinned on Civic Map at:</span>
                  <span className="font-bold text-[#102c20]">
                    {Number(submittedIssue.latitude).toFixed(5)}, {Number(submittedIssue.longitude).toFixed(5)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-500">Status:</span>
                <span className="font-bold text-[#102c20]">{submittedIssue.status}</span>
              </div>
            </div>

            <p className="mt-4 text-xs font-semibold text-[#1b6b51]">
              {hasMapCoordinates
                ? "This report is saved and already listed on the Civic Map at the coordinates above."
                : "This report is saved. No verified coordinates were captured, so it is listed in the issue register without a map marker."}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate("/map")}
                className="rounded-xl border border-[#006c49] bg-white px-6 py-3 font-bold text-[#006c49] shadow transition hover:bg-[#e7fff2]"
              >
                Open Civic Map
              </button>
              <button
                onClick={() => navigate(`/issue/${submittedIssue.id}`)}
                className="rounded-xl bg-[#006c49] px-6 py-3 font-bold text-white shadow-lg transition hover:bg-[#1b6b51]"
              >
                View Live Telemetry Page
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-[#006c49]/15 bg-white p-8 shadow-xl">
            <div className="border-b border-slate-100 pb-6">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#006c49]">
                Capture Telemetry
              </span>
              <h1 className="mt-1 text-3xl font-black text-[#102c20]">Report a Civic Issue</h1>
              <p className="mt-1 text-sm text-[#1b6b51]">
                Upload photographic evidence and details to log this problem into the public escalation ladder.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#102c20]">
                  Issue Photo Evidence <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  {imagePreview ? (
                    <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200">
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setImageFile(null); resetAnalysis(); }}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-52 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#006c49]/30 bg-[#e7fff2]/30 transition hover:bg-[#e7fff2]/60">
                      <Camera size={36} className="text-[#006c49]" />
                      <span className="mt-2 text-sm font-bold text-[#006c49]">
                        Click or drag photo here to upload
                      </span>
                      <span className="text-xs text-slate-500">Supports JPG, PNG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  {errors.image && <p className="mt-1 text-xs font-semibold text-red-500">{errors.image}</p>}
                </div>
              </div>

              {aiStatus !== "idle" && (
                <div className="rounded-2xl border-2 border-[#006591]/30 bg-gradient-to-br from-[#006591]/10 via-white to-[#006c49]/10 p-5 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006591] text-white shadow">
                      <Sparkles size={20} className={aiStatus === "analyzing" ? "animate-pulse" : ""} />
                    </span>
                    <div>
                      <p className="text-sm font-black uppercase tracking-wider text-[#006591]">AI Analysis</p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {aiStatus === "analyzing" && "Reading the evidence photo"}
                        {aiStatus === "done" && `Generated by ${aiResult?.source}`}
                        {aiStatus === "error" && "Analysis could not be completed"}
                      </p>
                    </div>
                  </div>

                  {aiStatus === "analyzing" && (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#006591]/15 bg-white/80 p-4">
                      <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#006591]/25 border-t-[#006591]" />
                      <p className="text-sm font-bold text-[#102c20]">CivicLens AI is analyzing the image...</p>
                    </div>
                  )}

                  {aiStatus === "error" && (
                    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      We could not read this image automatically. Please fill in the report fields below yourself.
                    </p>
                  )}

                  {aiStatus === "done" && aiResult && (
                    <>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-[#006591]/15 bg-white/80 p-3">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Issue detected</span>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-[#102c20]">
                            <Wand2 size={14} className="shrink-0 text-[#006591]" /> {aiResult.issueDetected}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[#006591]/15 bg-white/80 p-3">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Category</span>
                          <p className="mt-0.5 text-sm font-bold text-[#102c20]">{aiResult.category}</p>
                        </div>
                        <div className="rounded-xl border border-[#006591]/15 bg-white/80 p-3">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Severity</span>
                          <p className="mt-0.5 text-sm font-bold text-[#102c20]">{aiResult.severity}</p>
                        </div>
                        <div className="rounded-xl border border-[#006591]/15 bg-white/80 p-3">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Responsible department</span>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-[#102c20]">
                            <Building2 size={14} className="shrink-0 text-[#006591]" /> {aiResult.department}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 rounded-xl border border-[#006591]/15 bg-white/80 p-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">AI-generated description</span>
                        <p className="mt-0.5 text-sm leading-relaxed text-[#102c20]">{aiResult.description}</p>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#006591]/15">
                          <div className="h-full rounded-full bg-[#006591]" style={{ width: `${Math.round(aiResult.confidence * 100)}%` }} />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#006591]">
                          {Math.round(aiResult.confidence * 100)}% confidence
                        </span>
                      </div>

                      <p className="mt-3 text-[11px] font-semibold text-slate-500">
                        These values have been pre-filled into the report form below. Review and edit anything before submitting. Location / Area stays yours to set.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="rounded-2xl border-2 border-[#006c49]/25 bg-gradient-to-br from-[#006c49]/10 via-white to-[#006591]/10 p-5 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006c49] text-white shadow">
                    <MapPin size={20} className={locationStatus === "detecting" || locationStatus === "checking" ? "animate-pulse" : ""} />
                  </span>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-[#006c49]">Location</p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {locationStatus === "detected" && "📍 Location detected automatically ✓"}
                      {(locationStatus === "detecting" || locationStatus === "checking") && "Checking device location services"}
                      {locationStatus === "needs-action" && "Waiting for your permission"}
                      {locationStatus === "denied" && "Permission denied"}
                      {locationStatus === "unavailable" && "Location services unavailable"}
                      {locationStatus === "timeout" && "Location request timed out"}
                      {locationStatus === "unsupported" && "Not supported on this device"}
                      {locationStatus === "idle" && (manualLocation ? "Entered manually" : "Ready")}
                    </p>
                  </div>
                </div>

                {(locationStatus === "checking" || locationStatus === "detecting") && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#006c49]/15 bg-white/80 p-4">
                    <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#006c49]/25 border-t-[#006c49]" />
                    <p className="text-sm font-bold text-[#102c20]">
                      {locationStatus === "checking" ? "Checking location permission..." : "Detecting your current location..."}
                    </p>
                  </div>
                )}

                {locationStatus === "detected" && locationInfo && (
                  <>
                    <div className="mt-4 rounded-xl border border-[#006c49]/15 bg-white/80 p-4">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-[#102c20]">
                        <CheckCircle2 size={16} className="text-[#006c49]" /> Location Detected — GPS: Active ✓
                      </p>
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div>
                          <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Area</dt>
                          <dd className="text-sm font-semibold text-[#102c20]">{locationInfo.area || "Not resolved"}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">City</dt>
                          <dd className="text-sm font-semibold text-[#102c20]">{locationInfo.city || "Not resolved"}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">State</dt>
                          <dd className="text-sm font-semibold text-[#102c20]">{locationInfo.state || "Not resolved"}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Coordinates</dt>
                          <dd className="text-sm font-semibold text-[#102c20]">{locationInfo.latitude}, {locationInfo.longitude}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-[11px] font-semibold text-slate-500">
                        Accuracy ±{locationInfo.accuracy} m · Location source: device GPS
                      </p>
                    </div>

                    {locationInfo.placeLookupFailed && (
                      <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800">
                        Your GPS fix is confirmed and will be stored with this report, but the area name could not be looked up. Your coordinates are being used as the location label until you type an area below.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={runLocationDetection}
                      className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#006c49] hover:underline"
                    >
                      <Navigation size={14} /> Detect Location Again
                    </button>
                  </>
                )}

                {(locationStatus === "needs-action" || locationStatus === "unavailable") && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                      <MapPinOff size={16} /> Location Required
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90">
                      CivicLens needs your location to accurately identify the area of this civic issue. Please turn on Location Services and allow location access.
                    </p>
                    {locationStatus === "unavailable" && (
                      <p className="mt-2 rounded-lg bg-white/70 p-2.5 text-[11px] font-semibold text-amber-900">
                        Open your phone Settings → Location → Turn on Location, then return to CivicLens.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleTurnOnLocation}
                        className="flex items-center gap-1.5 rounded-lg bg-[#006c49] px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-[#1b6b51]"
                      >
                        <Navigation size={14} /> Turn On Location
                      </button>
                      <button
                        type="button"
                        onClick={handleManualLocation}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-50"
                      >
                        <PencilLine size={14} /> Select Area Manually
                      </button>
                    </div>
                  </div>
                )}

                {locationStatus === "denied" && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                      <AlertTriangle size={16} /> Location permission denied
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90">
                      Location permission was denied. Allow location access to automatically identify the issue area.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleTurnOnLocation}
                        className="flex items-center gap-1.5 rounded-lg bg-[#006c49] px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-[#1b6b51]"
                      >
                        <Navigation size={14} /> Allow Location Access
                      </button>
                      <button
                        type="button"
                        onClick={handleManualLocation}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-50"
                      >
                        <PencilLine size={14} /> Select Area Manually
                      </button>
                    </div>
                  </div>
                )}

                {(locationStatus === "timeout" || locationStatus === "unsupported") && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                      <MapPinOff size={16} />
                      {locationStatus === "timeout" ? "Location request timed out" : "Location not supported"}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90">
                      {locationStatus === "timeout"
                        ? "CivicLens could not get a GPS fix in time. Move to an open area and try again, or type the area yourself."
                        : "This browser does not support automatic location detection. Type the area of the issue instead."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {locationStatus === "timeout" && (
                        <button
                          type="button"
                          onClick={runLocationDetection}
                          className="flex items-center gap-1.5 rounded-lg bg-[#006c49] px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-[#1b6b51]"
                        >
                          <Navigation size={14} /> Try Again
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleManualLocation}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-50"
                      >
                        <PencilLine size={14} /> Select Area Manually
                      </button>
                    </div>
                  </div>
                )}

                {locationStatus === "idle" && manualLocation && (
                  <p className="mt-4 rounded-xl border border-[#006c49]/20 bg-white/80 p-3 text-xs font-semibold text-slate-600">
                    Enter the area in the Location / Area field below. CivicLens will try to match it to a map position; if it cannot, the report is still saved with your typed area.
                  </p>
                )}

                {aiResult?.visualLocationEstimate && (
                  <div className="mt-3 rounded-xl border border-[#006591]/20 bg-[#006591]/5 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#006591]">AI visual location estimate (unverified)</p>
                    <p className="mt-1 text-xs text-[#102c20]">
                      AI visual location estimate: <span className="font-bold">{aiResult.visualLocationEstimate}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-[#102c20]">
                      Verified device location: <span className="font-bold">{locationInfo ? composeLocationLabel(locationInfo) || "Coordinates only" : formData.location || "Not available"}</span>
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-600">
                      The verified device location is used for this report. The AI estimate is shown for reference only.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#102c20]">
                  Issue Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Deep Pothole near Central Junction"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-[#006c49]"
                />
                {errors.title && <p className="mt-1 text-xs font-semibold text-red-500">{errors.title}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-[#102c20]">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-[#006c49]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#102c20]">Observed Severity</label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-[#006c49]"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-[#102c20]">
                    Location / Area <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={runLocationDetection}
                    className="flex items-center gap-1 text-xs font-bold text-[#006c49] hover:underline"
                  >
                    <MapPin size={14} /> Detect Current GPS
                  </button>
                </div>
                <input
                  ref={locationInputRef}
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Koramangala 5th Block, 80ft Road"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-[#006c49]"
                />
                {errors.location && <p className="mt-1 text-xs font-semibold text-red-500">{errors.location}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#102c20]">
                  Description {aiStatus === "done" ? <span className="font-semibold text-[#006591]">(pre-filled by AI, editable)</span> : <span className="text-red-500">*</span>}
                </label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide specific details about the issue..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-[#006c49]"
                />
                {errors.description && <p className="mt-1 text-xs font-semibold text-red-500">{errors.description}</p>}
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[#006591]/20 bg-[#006591]/5 p-4 text-xs text-[#006591]">
                <Sparkles size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Evidence is attached to your report</span>
                  {aiStatus === "done"
                    ? "CivicLens AI has read your photo and pre-filled the fields above. The submitted report keeps this analysis on record."
                    : "Upload a photo and CivicLens AI will detect the issue, category, severity and a suggested department for you."}
                </div>
              </div>

              {submitError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{submitError}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-[#006c49] py-4 font-bold text-white shadow-lg transition hover:bg-[#1b6b51] disabled:opacity-50"
              >
                {isLoading ? "Submitting report..." : "Submit Civic Issue"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}