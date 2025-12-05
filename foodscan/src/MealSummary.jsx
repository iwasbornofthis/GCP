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

function MealSummary({ token, apiBase, isRed }) {
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

  const riskTone = isRed
    ? {
        high: "border border-red-400/60 bg-[#400000] text-red-100",
        medium: "border border-red-500/50 bg-[#2c0000] text-red-100",
        low: "border border-red-600/40 bg-[#210000] text-red-50",
      }
    : {
        high: "border border-rose-100 bg-rose-50 text-rose-700",
        medium: "border border-amber-100 bg-amber-50 text-amber-700",
        low: "border border-emerald-100 bg-emerald-50 text-emerald-700",
      };

  const tone = isRed
    ? {
        container:
          "border border-red-500/40 bg-[#1a0000]/90 p-4 text-red-50 shadow-[0_20px_45px_rgba(255,0,0,0.25)]",
        subtitle: "text-[12px] font-semibold uppercase tracking-normal text-red-200",
        title: "text-[16px] font-bold text-red-50",
        input:
          "rounded-xl border border-red-500/40 bg-[#2a0000] px-3 py-2 text-sm text-red-50 outline-none focus:border-red-400 focus:ring focus:ring-red-900/40",
        refresh:
          "rounded-xl border border-red-500/40 bg-[#330000] px-3 py-2 text-xs font-semibold text-red-50 shadow-sm transition hover:border-red-300 hover:text-red-100",
        metricCard: "rounded-xl border border-red-500/40 bg-[#2a0000] px-3 py-2 shadow-sm",
        metricLabel: "text-[12px] uppercase tracking-normal text-red-200",
        metricValue: "text-[18px] font-semibold text-red-50",
        metricUnit: "text-[12px] font-medium text-red-100/80",
        chipSummary: "rounded-full border border-red-500/40 bg-[#2d0000] px-3 py-1 font-semibold text-red-50",
        chipAvg: "rounded-full border border-red-500/40 bg-[#240000] px-3 py-1 font-medium text-red-100",
        tableWrap: "overflow-x-auto rounded-xl border border-red-500/40 shadow-sm",
        table: "w-full table-fixed text-[12px] text-red-50",
        thead: "bg-[#2c0000] text-[11px] font-semibold uppercase text-red-100",
        rowBorder: "border-t border-red-500/30",
        empty: "text-[12px] text-red-200",
        loading: "text-[12px] text-red-200",
        error: "text-[12px] text-rose-300",
      }
    : {
        container: "border border-emerald-200 bg-white/90 p-4 text-emerald-950 shadow",
        subtitle: "text-[12px] font-semibold uppercase tracking-normal text-emerald-700",
        title: "text-[16px] font-bold text-emerald-950",
        input:
          "rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100",
        refresh:
          "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-400",
        metricCard: "rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 shadow-sm",
        metricLabel: "text-[12px] uppercase tracking-normal text-emerald-700",
        metricValue: "text-[18px] font-semibold text-emerald-950",
        metricUnit: "text-[12px] font-medium text-emerald-900/70",
        chipSummary:
          "rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 font-semibold text-emerald-900",
        chipAvg: "rounded-full border border-emerald-200 bg-white px-3 py-1 font-medium text-emerald-800",
        tableWrap: "overflow-x-auto rounded-xl border border-emerald-200 shadow-sm",
        table: "w-full table-fixed text-[12px] text-emerald-900",
        thead: "bg-emerald-50 text-[11px] font-semibold uppercase text-emerald-800",
        rowBorder: "border-t border-emerald-100",
        empty: "text-[12px] text-emerald-700",
        loading: "text-[12px] text-emerald-700",
        error: "text-[12px] text-rose-500",
      };

  return (
    <div className={`flex h-full flex-col gap-3 rounded-2xl ${tone.container}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`m-0 ${tone.subtitle}`}>오늘의 영양 기록</p>
          <p className={`m-0 ${tone.title}`}>총계 · 최근 기록</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={tone.input}
          />
          <button
            type="button"
            onClick={() => fetchSummary(date)}
            className={tone.refresh}
          >
            새로고침
          </button>
        </div>
      </div>

      {loading && <p className={`m-0 ${tone.loading}`}>불러오는 중...</p>}
      {error && <p className={`m-0 ${tone.error}`}>{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            {metricFields.map((field) => (
              <div
                key={field.key}
                className={tone.metricCard}
              >
                <p className={`m-0 ${tone.metricLabel}`}>{field.label}</p>
                <p className={`m-0 ${tone.metricValue}`}>
                  {Number(totals[field.key] ?? 0).toFixed(field.digits)}
                  <span className={`ml-1 ${tone.metricUnit}`}>{field.unit}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className={tone.chipSummary}>
              고위험 {counts.high ?? 0} / 보통 {counts.medium ?? 0} / 낮음 {counts.low ?? 0}
            </span>
            {avgScore !== null && (
              <span className={tone.chipAvg}>
                평균 위험 점수 {Number(avgScore).toFixed(1)}
              </span>
            )}
          </div>

          <p className={`m-0 mt-2 text-[13px] font-semibold ${tone.title}`}>{date} 먹은 음식 목록</p>
          {records.length > 0 ? (
            <div className={tone.tableWrap}>
              <table className={tone.table}>
                <thead className={tone.thead}>
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
                      <tr key={rec.id ?? idx} className={tone.rowBorder}>
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
            <p className={`m-0 ${tone.empty}`}>아직 오늘자 기록이 없습니다.</p>
          )}
        </>
      )}
    </div>
  );
}

export default MealSummary;
