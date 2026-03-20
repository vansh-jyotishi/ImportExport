/* ================================================
   TradeFlow — API Client Service
   Connects frontend to Spring Boot backend.
   Falls back to static content when backend is unreachable.
   ================================================ */

const TradeFlowAPI = (function () {
    'use strict';

    // ─── Configuration ────────────────────────────────────
    // IMPORTANT: Change this to your backend URL.
    // For local development: http://localhost:8080
    // For production: https://your-deployed-backend.com
    const BASE_URL = 'http://localhost:8080/api';

    // Track if backend is reachable
    let backendAvailable = null; // null = unknown, true/false after first check

    const TOKEN_KEY = 'tradeflow_access_token';
    const REFRESH_KEY = 'tradeflow_refresh_token';
    const USER_KEY = 'tradeflow_user';

    // ─── Token Management ─────────────────────────────────
    function getAccessToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getRefreshToken() {
        return localStorage.getItem(REFRESH_KEY);
    }

    function getUser() {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function saveAuth(authResponse) {
        localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
        localStorage.setItem(REFRESH_KEY, authResponse.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
    }

    function clearAuth() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
    }

    function isLoggedIn() {
        return !!getAccessToken();
    }

    // ─── HTTP Helper ──────────────────────────────────────
    async function request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const token = getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            // If 401, try to refresh token
            if (response.status === 401 && getRefreshToken()) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${getAccessToken()}`;
                    const retryResponse = await fetch(url, { ...options, headers });
                    return handleResponse(retryResponse);
                } else {
                    clearAuth();
                    window.dispatchEvent(new Event('tradeflow:logout'));
                    throw new Error('Session expired. Please login again.');
                }
            }

            return handleResponse(response);
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                // Network error — backend unreachable
                backendAvailable = false;
                throw new Error('Backend unreachable');
            }
            throw error;
        }
    }

    async function handleResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        backendAvailable = true;
        return data;
    }

    async function refreshAccessToken() {
        try {
            const response = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: getRefreshToken() }),
            });
            if (response.ok) {
                const data = await response.json();
                saveAuth(data.data);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    // ─── Health Check ─────────────────────────────────────
    async function checkBackend() {
        if (backendAvailable !== null) return backendAvailable;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${BASE_URL}/platform-stats`, { signal: controller.signal });
            clearTimeout(timeout);
            backendAvailable = res.ok;
        } catch {
            backendAvailable = false;
        }
        return backendAvailable;
    }

    // ─── Auth Endpoints ───────────────────────────────────
    async function signup(data) {
        const res = await request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        saveAuth(res.data);
        return res;
    }

    async function login(email, password) {
        const res = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        saveAuth(res.data);
        return res;
    }

    async function logout() {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
            try {
                await request('/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({ refreshToken }),
                });
            } catch { /* ignore logout errors */ }
        }
        clearAuth();
    }

    // ─── Public Data Endpoints ────────────────────────────
    async function getPlatformStats() {
        const res = await request('/analytics/platform-stats');
        return res.data;
    }

    async function getProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await request(`/products${query ? '?' + query : ''}`);
        return res.data;
    }

    async function getCategories() {
        const res = await request('/categories');
        return res.data;
    }

    async function getCarriers(typeId) {
        const query = typeId ? `?typeId=${typeId}` : '';
        const res = await request(`/carriers${query}`);
        return res.data;
    }

    async function getCarrierTypes() {
        const res = await request('/carriers/types');
        return res.data;
    }

    async function trackShipment(trackingId) {
        const res = await request(`/shipments/track/${encodeURIComponent(trackingId)}`);
        return res.data;
    }

    async function getMyShipments(page = 0, size = 10) {
        const res = await request(`/shipments/my?page=${page}&size=${size}`);
        return res.data;
    }

    async function submitInquiry(data) {
        const res = await request('/inquiries', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res.data;
    }

    async function getMonthlyAnalytics(year) {
        const res = await request(`/analytics/monthly?year=${year}`);
        return res.data;
    }

    async function compareAnalytics(years) {
        const res = await request(`/analytics/monthly/compare?years=${years.join(',')}`);
        return res.data;
    }

    async function getRevenueByRegion(year) {
        const res = await request(`/analytics/revenue-by-region?year=${year}`);
        return res.data;
    }

    async function getSiteSettings() {
        const res = await request('/site-settings');
        return res.data;
    }

    async function getBanners(position = 'hero') {
        const res = await request(`/banners?position=${position}`);
        return res.data;
    }

    async function getPartners() {
        const res = await request('/partners');
        return res.data;
    }

    async function getTradeRoutes() {
        const res = await request('/trade-routes');
        return res.data;
    }

    async function getGlobeMarkers() {
        const res = await request('/globe-markers');
        return res.data;
    }

    // ─── Wallet Endpoints ─────────────────────────────────
    async function getWallet() {
        const res = await request('/wallet');
        return res.data;
    }

    async function topUpWallet(amount, description) {
        const res = await request('/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({ amount: amount.toString(), description }),
        });
        return res.data;
    }

    async function getWalletTransactions(page = 0, size = 20) {
        const res = await request(`/wallet/transactions?page=${page}&size=${size}`);
        return res.data;
    }

    // ─── Booking Endpoints ────────────────────────────────
    async function createBooking(data) {
        const res = await request('/bookings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res;
    }

    async function payBooking(bookingId) {
        const res = await request(`/bookings/${bookingId}/pay`, { method: 'POST' });
        return res;
    }

    async function cancelBooking(bookingId) {
        const res = await request(`/bookings/${bookingId}/cancel`, { method: 'POST' });
        return res;
    }

    async function getMyBookings(page = 0, size = 10) {
        const res = await request(`/bookings?page=${page}&size=${size}`);
        return res.data;
    }

    async function getBookingEstimate(weightKg, mode) {
        const res = await request(`/bookings/estimate?weightKg=${weightKg}&mode=${mode}`);
        return res.data;
    }

    // ─── Admin Endpoints ──────────────────────────────────
    async function adminGetDashboard() {
        const res = await request('/admin/dashboard');
        return res.data;
    }

    async function adminGetUsers(page = 0, size = 20) {
        const res = await request(`/admin/users?page=${page}&size=${size}`);
        return res.data;
    }

    async function adminGetBookings(page = 0, size = 20) {
        const res = await request(`/admin/bookings?page=${page}&size=${size}`);
        return res.data;
    }

    async function adminUpdateBookingStatus(bookingId, status) {
        const res = await request(`/admin/bookings/${bookingId}/status?status=${status}`, { method: 'PUT' });
        return res.data;
    }

    async function adminGetInquiries(page = 0, size = 20) {
        const res = await request(`/admin/inquiries?page=${page}&size=${size}`);
        return res.data;
    }

    async function adminUpdateInquiryStatus(id, status, notes) {
        const q = notes ? `&adminNotes=${encodeURIComponent(notes)}` : '';
        const res = await request(`/admin/inquiries/${id}/status?status=${status}${q}`, { method: 'PUT' });
        return res.data;
    }

    // ─── Public Interface ─────────────────────────────────
    return {
        BASE_URL,
        checkBackend,
        isBackendAvailable: () => backendAvailable,

        // Auth
        signup,
        login,
        logout,
        isLoggedIn,
        getUser,
        getAccessToken,
        clearAuth,

        // Data
        getPlatformStats,
        getProducts,
        getCategories,
        getCarriers,
        getCarrierTypes,
        trackShipment,
        getMyShipments,
        submitInquiry,
        getMonthlyAnalytics,
        compareAnalytics,
        getRevenueByRegion,
        getSiteSettings,
        // Wallet
        getWallet,
        topUpWallet,
        getWalletTransactions,
        // Bookings
        createBooking,
        payBooking,
        cancelBooking,
        getMyBookings,
        getBookingEstimate,
        // Admin
        adminGetDashboard,
        adminGetUsers,
        adminGetBookings,
        adminUpdateBookingStatus,
        adminGetInquiries,
        adminUpdateInquiryStatus,
        getBanners,
        getPartners,
        getTradeRoutes,
        getGlobeMarkers,
    };
})();
