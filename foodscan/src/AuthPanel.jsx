import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "foodscan-auth";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api";

const normalizeErrors = (payload) => {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.join("\n");
  }

  if (typeof payload === "object") {
    if (typeof payload.message === "string") {
      return payload.message;
    }

    if (payload.errors && typeof payload.errors === "object") {
      return Object.values(payload.errors)
        .flat()
        .map((value) => (typeof value === "string" ? value : JSON.stringify(value)))
        .join("\n");
    }

    return Object.values(payload)
      .flat()
      .map((value) => (typeof value === "string" ? value : JSON.stringify(value)))
      .join("\n");
  }

  return null;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const fallback = "요청 처리 중 오류가 발생했습니다.";
    const message = normalizeErrors(payload) ?? fallback;
    const error = new Error(message);
    error.payload = payload;
    throw error;
  }

  return payload;
};

const initialForm = {
  name: "",
  email: "",
  password: "",
  age: "",
  gender: "",
  height_cm: "",
  weight_kg: "",
  hba1c: "",
};

function AuthPanel({ onAuthChange, isFullScreen = false }) {
  const [form, setForm] = useState(initialForm);
  const [mode, setMode] = useState("register");
  const [auth, setAuth] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAuth(JSON.parse(stored));
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const storeAuth = (payload) => {
    setAuth(payload);
    if (payload) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    onAuthChange?.(payload);
  };

  const buildRegisterPayload = () => {
    const base = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      age: form.age ? Number(form.age) : undefined,
      gender: form.gender || undefined,
      height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
      hba1c: form.hba1c ? Number(form.hba1c) : undefined,
    };

    return Object.fromEntries(
      Object.entries(base).filter(([, value]) => value !== undefined && value !== "")
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "register" && !form.name.trim()) {
        throw new Error("이름을 입력해 주세요.");
      }
      if (!form.email.trim() || !form.password.trim()) {
        throw new Error("이메일과 비밀번호를 입력해 주세요.");
      }

      const payload =
        mode === "register"
          ? await request("/register", {
              method: "POST",
              body: JSON.stringify(buildRegisterPayload()),
            })
          : await request("/login", {
              method: "POST",
              body: JSON.stringify({
                email: form.email.trim(),
                password: form.password,
              }),
            });

      setForm(initialForm);
      storeAuth(payload);
      setMode("profile");
      setMessage(mode === "register" ? "회원가입 완료" : "로그인 완료");
    } catch (error) {
      setMessage(error.message || "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth?.token) {
      storeAuth(null);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await request("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      storeAuth(null);
      setMode("login");
      setMessage("로그아웃 완료");
    } catch (error) {
      setMessage(error.message || "로그아웃에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const currentMode = auth ? "profile" : mode;
  const heading = useMemo(() => {
    switch (currentMode) {
      case "login":
        return "로그인";
      case "register":
        return "회원가입";
      default:
        return "내 정보";
    }
  }, [currentMode]);

  const containerClass = isFullScreen
    ? "w-full rounded-[32px] bg-white p-6 shadow-2xl"
    : "w-full max-w-md rounded-[32px] border border-[#d1d5db] bg-white px-8 py-9 shadow-lg";

  return (
    <div className={`${containerClass} transition`}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-emerald-900">{heading}</h2>
        {!auth && (
          <div className="flex gap-2 rounded-full bg-emerald-100/80 p-1 text-xs font-semibold text-emerald-600 shadow-inner">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-3 py-1 transition ${
                mode === "register" ? "bg-white text-emerald-900 shadow" : "text-emerald-500"
              }`}
            >
              회원가입
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-3 py-1 transition ${
                mode === "login" ? "bg-white text-emerald-900 shadow" : "text-emerald-500"
              }`}
            >
              로그인
            </button>
          </div>
        )}
      </div>

      {auth ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#ecfdf5] p-5 text-sm text-emerald-900 shadow-inner">
            <p className="font-semibold">{auth.user?.name}</p>
            <p className="text-emerald-600">{auth.user?.email}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-emerald-700">
              <p>나이: {auth.user?.age ?? "-"}</p>
              <p>성별: {auth.user?.gender ?? "-"}</p>
              <p>키(cm): {auth.user?.height_cm ?? "-"}</p>
              <p>몸무게(kg): {auth.user?.weight_kg ?? "-"}</p>
              <p>HbA1c: {auth.user?.hba1c ?? "-"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <input
                type="text"
                name="name"
                placeholder="이름"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  name="age"
                  placeholder="나이"
                  value={form.age}
                  onChange={handleChange}
                  className="rounded-xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
                />
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="rounded-xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
                >
                  <option value="">성별</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  name="height_cm"
                  placeholder="키(cm)"
                  step="0.1"
                  value={form.height_cm}
                  onChange={handleChange}
                  className="rounded-xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
                />
                <input
                  type="number"
                  name="weight_kg"
                  placeholder="몸무게(kg)"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={handleChange}
                  className="rounded-xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
                />
              </div>
              <input
                type="number"
                name="hba1c"
                placeholder="HbA1c"
                step="0.1"
                value={form.hba1c}
                onChange={handleChange}
                className="w-full rounded-xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
              />
            </>
          )}

          <input
            type="email"
            name="email"
            placeholder="이메일"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
          />
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "요청 처리 중..." : mode === "register" ? "회원가입" : "로그인"}
          </button>
        </form>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
}

export default AuthPanel;
