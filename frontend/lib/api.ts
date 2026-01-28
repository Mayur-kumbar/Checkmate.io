import axios from "axios";

const API_URL = "http://localhost:4000/api";

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

export default api;