import { useEffect, useState } from "react";
import AuthPanel from "./AuthPanel";
import Home from "./Home";

const STORAGE_KEY = "foodscan-auth";
const THEME_KEY = "foodscan-theme";

function App() {
  const [auth, setAuth] = useState(null);
  const [theme, setTheme] = useState("default"); // default | red

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAuth(JSON.parse(stored));
    }

    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === "red") {
      setTheme("red");
      document.body.classList.add("red-theme");
    }
  }, []);

  const handleAuthChange = (payload) => {
    setAuth(payload);
    if (payload) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const toggleTheme = () => {
    const next = theme === "red" ? "default" : "red";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    if (next === "red") {
      document.body.classList.add("red-theme");
    } else {
      document.body.classList.remove("red-theme");
    }
  };

  const isRed = theme === "red";

  const isAuthenticated = Boolean(auth?.token);

  if (isAuthenticated) {
    return (
      <Home
        user={auth.user}
        token={auth.token}
        onLogout={() => handleAuthChange(null)}
        toggleTheme={toggleTheme}
        isRed={isRed}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-emerald-50">
      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col items-center justify-center px-4 py-8">
        <AuthPanel onAuthChange={handleAuthChange} isFullScreen />
      </div>
    </div>
  );
}

export default App;
