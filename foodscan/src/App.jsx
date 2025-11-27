import { useEffect, useState } from "react";
import AuthPanel from "./AuthPanel";
import Home from "./Home";

const STORAGE_KEY = "foodscan-auth";

function App() {
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAuth(JSON.parse(stored));
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

  const isAuthenticated = Boolean(auth?.token);

  if (isAuthenticated) {
    return (
      <Home user={auth.user} token={auth.token} onLogout={() => handleAuthChange(null)} />
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
