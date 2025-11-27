import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import MealSummary from "./MealSummary";

const CAMERA_CONSTRAINTS = [
  { video: { facingMode: "environment", advanced: [{ focusMode: "continuous" }] } },
  { video: { facingMode: "environment" } },
  { video: true },
];

const SCAN_LINE_STYLE = {
  background: "linear-gradient(90deg, transparent, #0f766e, transparent)",
};

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api";

const lookupQr = async (qrData, token) => {
  const response = await fetch(`${API_BASE}/foods/lookup`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ qrData }),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || "QR 영양 정보를 불러오지 못했습니다.");
  }
  return payload;
};

const NUTRIENT_FIELDS = [
  { key: "energy_kcal", label: "칼로리", unit: "kcal", digits: 0 },
  { key: "carbohydrate_g", label: "탄수화물", unit: "g", digits: 1 },
  { key: "protein_g", label: "단백질", unit: "g", digits: 1 },
  { key: "fat_g", label: "지방", unit: "g", digits: 1 },
  { key: "sugars_g", label: "당류", unit: "g", digits: 1 },
];

const normalizeRiskLevel = (level) => {
  if (level === undefined || level === null) return null;
  const value = String(level).trim().toLowerCase();
  if (value.includes("high") || value.includes("높")) return "high";
  if (value.includes("medium") || value.includes("mid") || value.includes("중") || value.includes("보통"))
    return "medium";
  if (value.includes("low") || value.includes("낮")) return "low";
  return null;
};

const parseMeasurement = (value, unit, raw) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { value, unit: normalizeUnit(unit) };
  }
  if (!raw) return null;
  const normalized = String(raw).replace(/\s+/g, "");
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)([a-zA-Z]*)$/);
  if (!match) return null;
  return {
    value: Number(match[1]),
    unit: normalizeUnit(match[2] || unit),
  };
};

const normalizeUnit = (unit) => {
  if (!unit) return null;
  return String(unit).trim().toLowerCase();
};

const resolvePortionFactor = (result) => {
  const factor = result?.glucoseRisk?.portion_factor;
  if (typeof factor === "number" && factor > 0) return factor;

  const mf = result?.matchedFood;
  if (!mf || typeof mf !== "object") return null;

  const product = parseMeasurement(mf.product_weight_value, mf.product_weight_unit, mf.product_weight);
  const serving = parseMeasurement(mf.serving_size_value, mf.serving_size_unit, mf.serving_size);

  if (!product || !serving || !Number.isFinite(product.value) || !Number.isFinite(serving.value) || serving.value <= 0)
    return null;
  if (product.unit && serving.unit && product.unit !== serving.unit) return null;

  return product.value / serving.value;
};

const scaleNutrients = (nutrients, factor) => {
  if (!factor || factor <= 0 || !nutrients) return nutrients;
  const scaled = { ...nutrients };
  ["energy_kcal", "carbohydrate_g", "sugars_g", "protein_g", "fat_g"].forEach((key) => {
    if (scaled[key] !== undefined && scaled[key] !== null && Number.isFinite(Number(scaled[key]))) {
      scaled[key] = Number(scaled[key]) * factor;
    }
  });
  return scaled;
};

function Home({ user, token, onLogout }) {
  const [mode, setMode] = useState("scan"); // scan | photo
  const [previewSrc, setPreviewSrc] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanHint, setScanHint] = useState("QR을 프레임 중앙에 맞춰 주세요.");
  const [lastDetected, setLastDetected] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [view, setView] = useState("capture"); // capture | history
  const [menuOpen, setMenuOpen] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetAnalysis = () => {
    setResult(null);
    setError("");
  };

  const formatNutrientValue = (value, digits = 1) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const fixed = num.toFixed(digits);
    return digits === 0 ? Number(fixed).toLocaleString() : Number(fixed).toString();
  };

  const handlePhotoMode = () => {
    if (previewSrc) {
      URL.revokeObjectURL(previewSrc);
      setPreviewSrc(null);
    }
    setPhotoFile(null);
    resetAnalysis();
    setMode("photo");
  };

  const handleScanMode = () => {
    if (previewSrc) {
      URL.revokeObjectURL(previewSrc);
      setPreviewSrc(null);
    }
    setPhotoFile(null);
    resetAnalysis();
    setMode("scan");
  };

  const handleGallerySelect = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      if (event.target) event.target.value = "";
      return;
    }
    if (previewSrc) URL.revokeObjectURL(previewSrc);
    const nextUrl = URL.createObjectURL(file);
    setPreviewSrc(nextUrl);
    setPhotoFile(file);
    resetAnalysis();
    if (event.target) event.target.value = "";
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      alert("카메라가 준비되지 않았습니다.");
      return;
    }
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          alert("사진을 캡처하지 못했습니다.");
          return;
        }
        if (previewSrc) URL.revokeObjectURL(previewSrc);
        const objectUrl = URL.createObjectURL(blob);
        setPreviewSrc(objectUrl);
        setPhotoFile(new File([blob], "capture.jpg", { type: blob.type || "image/jpeg" }));
        resetAnalysis();
      },
      "image/jpeg",
      0.92,
    );
  };

  const analyzePhoto = async () => {
    if (!photoFile) {
      setError("분석할 이미지를 선택하거나 촬영해 주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("photo", photoFile, photoFile.name || "upload.jpg");

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/foods/analyze`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(payload?.message || "이미지 분석 중 오류가 발생했습니다.");
      }
      setResult(payload);
    } catch (err) {
      setError(err.message || "이미지 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = useCallback(
    async (qrData) => {
      if (!qrData) return;
      setError("");
      setResult(null);
      try {
        const payload = await lookupQr(qrData, token);
        const nutrients = payload.nutrients || {};
        const product = payload.product || {};
        const servingTotal =
          product.serving_total && product.serving_total_unit
            ? `${product.serving_total}${product.serving_total_unit}`
            : product.serving_total ?? null;
        setResult({
          foodName: product.name || "QR 식품",
          matchedFood: {
            food_name: product.name,
            serving_size: servingTotal,
            product_weight: servingTotal,
            food_code: product.barcode,
          },
          nutrients,
          glucoseRisk: payload.glucoseRisk ?? null,
          confidence: null,
          notes: product.manufacturer || null,
        });
      } catch (err) {
        setError(err.message || "QR 영양 조회 중 오류가 발생했습니다.");
      }
    },
    [token],
  );

  // 카메라 시작/정지
  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      if (streamRef.current && streamRef.current.active) {
        if (videoRef.current) {
          if (videoRef.current.srcObject !== streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
          }
          try {
            await videoRef.current.play();
          } catch {
            // autoplay might be blocked; ignore
          }
        }
        return;
      }
      for (const constraint of CAMERA_CONSTRAINTS) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraint);
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          return;
        } catch (err) {
          console.warn("Camera attempt failed:", err?.name);
        }
      }
      alert("카메라 접근을 허용해 주세요.");
    };

    if (view === "capture" && (mode === "scan" || mode === "photo")) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      cancelled = true;
      // 스캔/사진 모드 간 전환 시 스트림을 유지해 깜빡임을 줄인다.
      if (mode !== "scan" && mode !== "photo") {
        stopCamera();
      }
    };
  }, [mode, view, stopCamera]);

  useEffect(() => {
    // 컴포넌트 언마운트 시에는 반드시 스트림을 정리
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // QR 스캔 루프
  useEffect(() => {
    if (view !== "capture" || mode !== "scan") return;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          const detected = code.data.trim();
          if (detected) {
            setLastDetected(detected);
            setScanHint("QR을 인식했습니다. 결과를 불러오는 중...");
            stopCamera();
            handleLookup(detected);
            return;
          }
        }
      }
      setScanHint("QR을 프레임 중앙에 맞춰 주세요.");
      animationIdRef.current = requestAnimationFrame(tick);
    };
    animationIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [mode, view, handleLookup, stopCamera]);

  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (event) => {
      const menuEl = menuRef.current;
      const btnEl = menuButtonRef.current;
      if (!menuEl || !btnEl) return;
      if (menuEl.contains(event.target) || btnEl.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [menuOpen]);

  const normalizeNutrient = (nutrients, key) => {
    const value = nutrients?.[key];
    if (value === null || value === undefined) return null;
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const saveResult = async () => {
    if (!result) return;
    if (!token) {
      setSaveMessage("로그인이 필요합니다.");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);

    const payload = {
      recorded_at: dateStr,
      source: mode === "scan" ? "qr" : "photo",
      food_name: result.foodName ?? null,
      matched_food_id: result.matchedFood?.id ?? null,
      energy_kcal: normalizeNutrient(result.nutrients, "energy_kcal"),
      carbohydrate_g: normalizeNutrient(result.nutrients, "carbohydrate_g"),
      sugars_g: normalizeNutrient(result.nutrients, "sugars_g"),
      protein_g: normalizeNutrient(result.nutrients, "protein_g"),
      fat_g: normalizeNutrient(result.nutrients, "fat_g"),
      glucose_risk_level: result.glucoseRisk?.level ?? null,
      glucose_risk_score:
        typeof result.glucoseRisk?.score === "number" ? result.glucoseRisk.score : null,
      raw_payload: result,
    };

    try {
      const response = await fetch(`${API_BASE}/meals`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(data?.message || "기록 저장에 실패했습니다.");
      }
      setSaveMessage("저장되었습니다.");
    } catch (err) {
      setSaveMessage(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };


  const renderResult = () => {
    if (!result) return null;
    const hasConfidence =
      typeof result.confidence === "number" && !Number.isNaN(result.confidence);
    const factor = resolvePortionFactor(result);
    const nutrients = scaleNutrients(result.nutrients ?? {}, factor);
    const nutrientItems = NUTRIENT_FIELDS.map((field) => {
      const baseValue = nutrients[field.key];
      if (baseValue === null || baseValue === undefined) return null;
      const formatted = formatNutrientValue(baseValue, field.digits ?? 1);
      if (formatted === null) return null;
      return { ...field, value: formatted };
    }).filter(Boolean);

    const glucoseRisk = result.glucoseRisk ?? null;
    const riskLevel = normalizeRiskLevel(glucoseRisk?.level);
    const riskScore =
      typeof glucoseRisk?.score === "number" ? glucoseRisk.score.toFixed(1) : null;
    const riskMessage = glucoseRisk?.message ?? null;

    const riskPillStyles = {
      low: "bg-emerald-200 text-emerald-950 border-emerald-500",
      medium: "bg-amber-200 text-amber-950 border-amber-500",
      high: "bg-rose-400 text-white border-rose-600",
    };
    const riskLabel = {
      low: "낮음",
      medium: "보통",
      high: "높음",
    };
    const riskPillClass =
      riskPillStyles[riskLevel] ??
      (glucoseRisk ? "bg-rose-400 text-white border-rose-600" : "border-emerald-300 bg-emerald-100 text-emerald-950");

    return (
      <div className="mt-3 text-[13px] text-emerald-950">
        <div className="rounded-xl bg-white p-4 shadow-lg">
          <p className="text-[15px] font-semibold text-emerald-950">
            {result.foodName || "음식명을 찾을 수 없습니다"}
          </p>
          {hasConfidence && (
            <p className="mt-1 text-[12px] uppercase tracking-[0.3em] text-emerald-700">
              신뢰도 {(result.confidence * 100).toFixed(1)}%
            </p>
          )}
          {result.notes && (
            <p className="mt-2 text-[14px] leading-relaxed text-emerald-950/80">
              {result.notes}
            </p>
          )}
        </div>

        {glucoseRisk && (
          <div className="mt-3 rounded-xl bg-white p-4 text-emerald-950 shadow">
            <p className="text-[15px] font-semibold uppercase tracking-normal text-emerald-950">
              혈당 위험도
            </p>
            <div className="mt-3 flex flex-col gap-2 text-[14px]">
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${riskPillClass}`}
              >
                {riskLabel[riskLevel] ?? "평가 중"}
                <span className="text-[12px] text-emerald-950/70">({riskScore})</span>
              </div>
              {riskMessage && <p className="text-emerald-950/80">{riskMessage}</p>}
            </div>
          </div>
        )}

        {nutrientItems.length > 0 ? (
          <div className="mt-3 rounded-xl bg-white p-4 shadow">
            <p className="text-[15px] font-semibold uppercase tracking-normal text-emerald-950">
              영양 정보
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-emerald-950">
              {nutrientItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-left shadow-sm"
                >
                  <p className="text-[12px] uppercase tracking-[0.15em] text-emerald-700">
                    {item.label}
                  </p>
                  <p className="text-[20px] font-semibold text-emerald-950">
                    {item.value}
                    <span className="ml-1 text-[13px] font-medium text-emerald-950/70">
                      {item.unit}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-white/70 p-4 text-[12px] text-emerald-950 shadow">
            영양 정보를 불러오지 못했습니다.
          </p>
        )}
      </div>
    );
  };


  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-emerald-200 via-emerald-100 to-emerald-50 text-emerald-950 md:flex md:justify-center md:overflow-visible md:px-6 md:py-10">
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-transparent text-emerald-950 md:mx-auto md:grid md:min-h-[720px] md:max-w-6xl md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-8 md:overflow-visible md:rounded-[40px] md:border md:border-emerald-200 md:bg-white/70 md:px-10 md:py-10 md:shadow-[0_35px_120px_rgba(4,118,110,0.25)] backdrop-blur-sm">
          <div
            className={`relative z-20${view === "capture" ? " pb-[220px]" : ""} md:col-start-2 md:row-start-1 md:row-span-4 md:flex md:h-full md:flex-col md:items-center md:gap-6 md:self-stretch md:pb-0`}
          >
            <header className="relative z-40 w-full px-7 pt-[50px] pb-5 md:static md:flex-none md:px-0 md:pt-0 md:pb-0">
              <div className="relative mx-auto flex w-full max-w-[360px] items-center justify-between rounded-2xl border border-emerald-200 bg-white/95 px-5 py-4 text-emerald-950 shadow md:mx-0">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                    FoodScan
                  </p>
                  <h1 className="m-0 text-[22px] font-bold text-emerald-950">
                    {user?.name ? `${user.name}` : "스캔으로 식사를 기록해 보세요"}
                  </h1>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    ref={menuButtonRef}
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 shadow hover:border-emerald-400"
                    aria-label="메뉴 열기"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-emerald-200 bg-white p-2 text-sm text-emerald-900 shadow-xl"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setView("capture");
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-emerald-50"
                      >
                        <span>스캔 / 사진</span>
                        <span className="text-[11px] text-emerald-700">캡처</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setView("history");
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-emerald-50"
                      >
                        <span>나의 식단 기록</span>
                        <span className="text-[11px] text-emerald-700">요약</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          // 나의 정보는 추후 상세화면 연결 예정
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-emerald-50"
                      >
                        <span>나의 정보</span>
                        <span className="text-[11px] text-emerald-700">프로필</span>
                      </button>
                      {onLogout && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onLogout();
                          }}
                          className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                        >
                          <span>로그아웃</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="md:flex md:h-full md:w-full md:flex-1 md:flex-col md:items-center md:gap-4 md:pb-2">
              {view === "capture" ? (
                <>
              {result && (
                <section className="relative z-20 px-7 pt-4 md:order-2 md:static md:w-full md:flex-1 md:px-0 md:pb-4 md:pt-0">
                  <div className="mx-auto w-full max-w-[360px] space-y-3 md:mx-0">
                    {renderResult()}
                    {token && (
                      <div className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-emerald-900 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="m-0 font-semibold text-emerald-950">저장 및 요약</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={saveResult}
                              disabled={saving}
                              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow transition hover:brightness-110 disabled:opacity-60"
                            >
                              {saving ? "저장 중..." : "오늘 기록에 저장"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setView("history")}
                              className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-400"
                            >
                              나의 식단 기록 보기
                            </button>
                          </div>
                        </div>
                        {saveMessage && (
                          <p className="m-0 text-xs text-emerald-700">{saveMessage}</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}


              <footer className="fixed inset-x-0 bottom-0 z-30 px-7 pb-7 pt-4 md:order-4 md:static md:w-full md:px-0 md:pb-0 md:pt-0">
                <div className="mx-auto w-full max-w-[360px] space-y-3 md:mx-0">
                  {!result && (
                    <div className="rounded-xl bg-white px-4 py-3 text-emerald-950 shadow-2xl">
                      <p className="text-[15px] leading-relaxed text-center">
                        {mode === "scan" ? "QR을 프레임 중앙에 맞춰 주세요." : "촬영하거나 갤러리에서 선택해 주세요."}
                      </p>

                      {mode === "photo" && (
                        <div className="flex flex-wrap items-center justify-center gap-2 text-[13px]">
                          <button
                            type="button"
                            onClick={handleCapture}
                            className="rounded-full border border-emerald-800 bg-emerald-800 px-4 py-1 font-semibold text-white shadow transition hover:brightness-110"
                          >
                            촬영하기
                          </button>
                          <button
                            type="button"
                            onClick={handleGallerySelect}
                            className="rounded-full border border-emerald-800 bg-emerald-800 px-4 py-1 font-semibold text-white shadow transition hover:brightness-110"
                          >
                            갤러리
                          </button>
                          <button
                            type="button"
                            onClick={analyzePhoto}
                            disabled={!photoFile || loading}
                            className="rounded-full border border-emerald-800 bg-emerald-800 px-4 py-1 font-semibold text-white shadow transition hover:brightness-110 disabled:opacity-50"
                          >
                            {loading ? "분석 중..." : "분석하기"}
                          </button>
                        </div>
                      )}

                      {error && <p className="mt-2 text-center text-[13px] text-rose-500">{error}</p>}
                    </div>
                  )}
                  <div className="flex w-full justify-center gap-4">
                    <button
                      type="button"
                      onClick={handlePhotoMode}
                      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl px-[12px] py-4 text-sm font-semibold transition-transform duration-200 active:scale-95 ${
                        mode === "photo"
                          ? "bg-emerald-600 text-white shadow-lg"
                          : "bg-white text-emerald-800 shadow border border-emerald-200"
                      }`}
                    >
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>음식 사진</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleScanMode}
                      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl px-[12px] py-4 text-sm font-semibold transition-transform duration-200 active:scale-95 ${
                        mode === "scan"
                          ? "bg-emerald-600 text-white shadow-lg"
                          : "bg-white text-emerald-800 shadow border border-emerald-200"
                      }`}
                    >
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5"
                        />
                      </svg>
                      <span>QR 스캔</span>
                    </button>
                  </div>
                </div>
              </footer>
              </>
            ) : (
              <section className="relative z-10 px-7 md:static md:w-full md:px-0 md:py-4">
                <div className="mx-auto w-full max-w-[360px] md:mx-0">
                  <MealSummary token={token} apiBase={API_BASE} />
                </div>
              </section>
            )}
            </div>
          </div>

          {view === "capture" && (
            <main className="absolute inset-0 z-0 flex h-full w-full flex-col items-center justify-center overflow-hidden text-center pointer-events-none md:static md:relative md:col-start-1 md:row-start-1 md:row-span-4 md:h-full md:flex-1 md:rounded-[36px] md:border md:border-emerald-200 md:bg-emerald-900/10 md:px-6 md:py-6 md:shadow-[0_25px_80px_rgba(4,118,110,0.25)]">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`absolute inset-0 z-[1] h-full w-full object-cover ${previewSrc ? "opacity-0" : "opacity-100"}`}
              />
              {previewSrc && (
                <img
                  src={previewSrc}
                  alt="선택한 음식 사진"
                  className="absolute inset-0 z-[1] h-full w-full object-cover"
                />
              )}
              <div
                className={`absolute left-1/2 top-1/2 z-[2] h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
                  mode === "scan" ? "opacity-100" : "opacity-50"
                }`}
              >
                <div className="absolute left-0 top-0 h-[40px] w-[40px] border-[5px] border-emerald-500 border-r-0 border-b-0" />
                <div className="absolute right-0 top-0 h-[40px] w-[40px] border-[5px] border-emerald-500 border-l-0 border-b-0" />
                <div className="absolute bottom-0 left-0 h-[40px] w-[40px] border-[5px] border-emerald-500 border-r-0 border-t-0" />
                <div className="absolute bottom-0 right-0 h-[40px] w-[40px] border-[5px] border-emerald-500 border-l-0 border-t-0" />
                {mode === "scan" && (
                  <div
                    className="absolute left-0 right-0 h-1 rounded shadow-[0_0_12px_1px_rgba(1,183,160,0.6)] animate-scan"
                    style={SCAN_LINE_STYLE}
                  />
                )}
              </div>
            </main>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}

export default Home;
