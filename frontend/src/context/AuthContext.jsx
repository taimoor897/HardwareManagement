
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("hardware_shop_token");
    localStorage.removeItem("hardware_shop_user");
    setUser(null);
    setShop(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem("hardware_shop_token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");
      setUser(response.data.data.user);
      setShop(response.data.data.shop);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const { token, user: loggedInUser } = response.data.data;

    localStorage.setItem("hardware_shop_token", token);
    localStorage.setItem(
      "hardware_shop_user",
      JSON.stringify(loggedInUser)
    );

    setUser(loggedInUser);

    const profile = await api.get("/auth/me");
    setUser(profile.data.data.user);
    setShop(profile.data.data.shop);

    return profile.data.data;
  };

  const value = {
    user,
    shop,
    loading,
    login,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
