import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { API_URL } from "../utils/api";

interface AuthContextType {
  loggedIn: boolean;
  loading: boolean;
  checkLoginStatus: () => Promise<void>;
  setLoggedIn: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  loggedIn: false, 
  loading: true,
  checkLoginStatus: async () => {},
  setLoggedIn: () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const checkLoginStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/checkLogin`, { credentials: "include" });
      const data = await response.json();
      console.log(data);
      if (data.success === true) {
        setLoggedIn(true);
        localStorage.setItem("loggedIn", "true");
      } else {
        setLoggedIn(false);
        localStorage.removeItem("loggedIn");
      }
    } catch (error) {
      console.error("Error checking login status:", error);
      setLoggedIn(false);
      localStorage.removeItem("loggedIn");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    checkLoginStatus();
  }, [location.pathname, checkLoginStatus]);

  return (
    <AuthContext.Provider value={{ loggedIn, loading, checkLoginStatus, setLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

