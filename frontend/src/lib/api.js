import axios from "axios";
import { useEffect, useRef, useState } from "react";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = "imba_panel_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export const http = axios.create({ baseURL: API });
http.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !String(err.config?.url || "").includes("/auth/login")) {
      setToken(null);
      if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e, fallback = "Что-то пошло не так") => {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
  return e?.message === "Network Error" ? "Нет связи с сервером" : fallback;
};

/**
 * Live state via long-polling. Works everywhere (OBS, phones, proxies).
 * Returns { data, online }.
 */
export function useLiveState(channel) {
  const [data, setData] = useState(null);
  const [online, setOnline] = useState(true);
  const versionRef = useRef(null);

  useEffect(() => {
    let alive = true;
    let ctrl = null;
    const loop = async () => {
      while (alive) {
        ctrl = new AbortController();
        try {
          const q = versionRef.current != null ? `?since=${versionRef.current}` : "";
          const res = await fetch(`${API}/widget/${channel}${q}`, { signal: ctrl.signal, cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          if (!alive) return;
          setOnline(true);
          if (json.version !== versionRef.current) {
            versionRef.current = json.version;
            setData(json);
          }
        } catch (e) {
          if (!alive) return;
          setOnline(false);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    };
    loop();
    return () => {
      alive = false;
      if (ctrl) ctrl.abort();
    };
  }, [channel]);

  // allow optimistic push from panel actions
  const push = (json) => {
    if (!json || json.version == null) return;
    if (versionRef.current == null || json.version > versionRef.current) {
      versionRef.current = json.version;
      setData(json);
    }
  };

  return { data, online, push };
}
