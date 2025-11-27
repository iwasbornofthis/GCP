import { useEffect, useMemo, useState } from "react";

const metricFields = [
  { key: "energy_kcal", label: "칼로리", unit: "kcal", digits: 0 },
  { key: "carbohydrate_g", label: "탄수화물", unit: "g", digits: 1 },
  { key: "sugars_g", label: "당류", unit: "g", digits: 1 },
  { key: "protein_g", label: "단백질", unit: "g", digits: 1 },
  { key: "fat_g", label: "지방", unit: "g", digits: 1 },
];

const riskLabel = {
  high: "고위험",
  medium: "보통",
  low: "낮음",
};

const riskTone = {
  high: "border border-rose-100 bg-rose-50 text-rose-700",
  medium: "border border-amber-100 bg-amber-50 text-amber-700",
  low: "border border-emerald-100 bg-emerald-50 text-emerald-700",
};

const todayString = () => new Date().toISOString().slice(0, 10);

const formatNumber = (value, digits = 1) => {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "-";
};

const formatRisk = (level, score) => {
  if (!level) return "-";
  const label = riskLabel[level] ?? level;
  if (score === null || score === undefined) return label;
  const num = Number(score);
  return Number.isFinite(num) ? `${label} (${num.toFixed(1)})` : label;
};

const formatTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
};

function MealSummary({ token, apiBase }) {
  const [date, setDate] = useState(todayString());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSummary = async (targetDate) => {
    if (!token) {
      setError("로그인이 필요해요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBase}/meals/summary${targetDate ? `?date=${encodeURIComponent(targetDate)}` : ""}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(payload?.message || "요청을 불러오지 못했어요.");
      }
      setData(payload);
    } catch (err) {
      setError(err.message || "요청을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSummary(date);
  }, [token, date]);

  const records = useMemo(() => (Array.isArray(data?.records) ? data.records : []), [data]);
  const totals = data?.totals ?? {};
  const counts = data?.glucose_risk?.counts ?? {};
  const avgScore = data?.glucose_risk?.avg_score ?? null;

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-emerald-200 bg-white/90 p-4 text-emerald-950 shadow">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-normal text-emerald-700">
            오늘의 영양 기록
          </p>
          <p className="m-0 text-[16px] font-bold text-emerald-950">총계 · 최근 기록</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={() => fetchSummary(date)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-400"
          >
            새로고침
          </button>
        </div>
      </div>

      {loading && <p className="m-0 text-[12px] text-emerald-700">불러오는 중...</p>}
      {error && <p className="m-0 text-[12px] text-rose-500">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            {metricFields.map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 shadow-sm"
              >
                <p className="m-0 text-[12px] uppercase tracking-normal text-emerald-700">
                  {field.label}
                </p>
                <p className="m-0 text-[18px] font-semibold text-emerald-950">
                  {Number(totals[field.key] ?? 0).toFixed(field.digits)}
                  <span className="ml-1 text-[12px] font-medium text-emerald-900/70">
                    {field.unit}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 font-semibold text-emerald-900">
              고위험 {counts.high ?? 0} / 보통 {counts.medium ?? 0} / 낮음 {counts.low ?? 0}
            </span>
            {avgScore !== null && (
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 font-medium text-emerald-800">
                평균 위험 점수 {Number(avgScore).toFixed(1)}
              </span>
            )}
          </div>

          <p className="m-0 mt-2 text-[13px] font-semibold text-emerald-900">
            {date} 먹은 음식 목록
          </p>
          {records.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-emerald-200 shadow-sm">
              <table className="w-full table-fixed text-[12px] text-emerald-900">
                <thead className="bg-emerald-50 text-[11px] font-semibold uppercase text-emerald-800">
                  <tr>
                    <th className="px-3 py-2 text-left">음식</th>
                    <th className="px-3 py-2 text-right">열량(kcal)</th>
                    <th className="px-3 py-2 text-right">혈당위험</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, idx) => {
                    const risk = rec.glucose_risk_level;
                    return (
                      <tr key={rec.id ?? idx} className="border-t border-emerald-100">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold">{rec.food_name || "기록"}</span>
                          </div>
                        </td>
                        
                        <td className="px-3 py-2 text-right">{formatNumber(rec.energy_kcal, 0)}</td>
                        <td className="px-3 py-2 text-right">
                          {risk ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                                riskTone[risk] ??
                                "border border-emerald-100 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {formatRisk(risk, rec.glucose_risk_score)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="m-0 text-[12px] text-emerald-700">아직 오늘자 기록이 없습니다.</p>
          )}
        </>
      )}
    </div>
  );
}

export default MealSummary;
