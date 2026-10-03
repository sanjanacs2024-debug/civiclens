import { useEffect, useState } from "react";
import { AuthContext } from "./authState";
import { apiService, sessionService } from "../services/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => sessionService.getUser());
  const [loading, setLoading] = useState(() => Boolean(sessionService.getToken()));

  useEffect(() => {
    if (!sessionService.getToken()) return undefined;
    let isCurrent = true;

    apiService.getCurrentUser().then((result) => {
      if (!isCurrent) return;
      if (result.success) {
        sessionService.updateUser(result.data.user);
        setUser(result.data.user);
      } else if (!result.networkError && result.status !== 503) {
        sessionService.clear();
        setUser(null);
      }
    }).finally(() => {
      if (isCurrent) setLoading(false);
    });

    return () => { isCurrent = false; };
  }, []);

  const signIn = (session, rememberMe) => {
    sessionService.saveSession(session, rememberMe);
    setUser(session.user);
  };

  const signOut = () => {
    sessionService.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}