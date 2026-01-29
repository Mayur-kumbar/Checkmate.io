import api from "./api";

export async function isAuthenticated() {
  try {
    const res = await api.get("/auth/me");
    return res.data.success;
  } catch {
    return false;
  }
}
