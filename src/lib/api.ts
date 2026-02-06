// API Client for communicating with the on-premise backend

import { User, AuthUser } from '../types/User';
import { CaseData } from '../types/Case';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'case_monitoring_access_token';
const REFRESH_TOKEN_KEY = 'case_monitoring_refresh_token';
const USER_KEY = 'case_monitoring_user';

// Helper to get stored tokens
function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function getStoredUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }
    return null;
}

function setStoredUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Generic fetch wrapper with auth header and token refresh
async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    const accessToken = getAccessToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (accessToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        let response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        // If token expired, try to refresh
        if (response.status === 401) {
            const refreshToken = getRefreshToken();
            if (refreshToken) {
                const refreshResult = await refreshAccessToken(refreshToken);
                if (refreshResult.success && refreshResult.data) {
                    // Retry the original request with new token
                    (headers as Record<string, string>)['Authorization'] = `Bearer ${refreshResult.data.accessToken}`;
                    response = await fetch(`${API_BASE_URL}${endpoint}`, {
                        ...options,
                        headers,
                    });
                } else {
                    // Refresh failed, clear tokens
                    clearTokens();
                    return { success: false, error: 'Session expired. Please login again.' };
                }
            } else {
                return { success: false, error: 'Authentication required' };
            }
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API request failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

// Refresh access token
async function refreshAccessToken(
    refreshToken: string
): Promise<{ success: boolean; data?: { accessToken: string; refreshToken: string } }> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        const result = await response.json();
        if (result.success && result.data) {
            setTokens(result.data.accessToken, result.data.refreshToken);
        }
        return result;
    } catch {
        return { success: false };
    }
}

// ============================================================
// AUTH API
// ============================================================

export async function login(
    username: string,
    password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (result.success && result.data) {
            setTokens(result.data.accessToken, result.data.refreshToken);
            setStoredUser(result.data.user);
            return { success: true, user: result.data.user };
        }

        return { success: false, error: result.error || 'Login failed' };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

export async function logout(): Promise<{ success: boolean }> {
    try {
        await fetchWithAuth('/auth/logout', { method: 'POST' });
    } catch {
        // Ignore errors on logout
    }
    clearTokens();
    return { success: true };
}

export async function getCurrentUser(): Promise<{ success: boolean; user?: User; error?: string }> {
    // First check local storage
    const storedUser = getStoredUser();
    const token = getAccessToken();

    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    // Verify with server
    const result = await fetchWithAuth<User>('/auth/me');

    if (result.success && result.data) {
        setStoredUser(result.data);
        return { success: true, user: result.data };
    }

    // If server verification fails but we have stored user, use it
    if (storedUser) {
        return { success: true, user: storedUser };
    }

    return { success: false, error: result.error };
}

export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    return fetchWithAuth('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
    });
}

export async function updateProfile(
    name: string,
    employeeNumber?: string
): Promise<{ success: boolean; user?: User; error?: string }> {
    const result = await fetchWithAuth<User>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, employeeNumber }),
    });

    if (result.success && result.data) {
        setStoredUser(result.data);
        return { success: true, user: result.data };
    }

    return { success: false, error: result.error };
}

// ============================================================
// USER MANAGEMENT API (SP only)
// ============================================================

export async function getAllUsers(): Promise<{ success: boolean; users?: User[]; error?: string }> {
    const result = await fetchWithAuth<User[]>('/users');
    return { success: result.success, users: result.data, error: result.error };
}

export async function createUser(
    userData: Omit<AuthUser, 'id'>
): Promise<{ success: boolean; user?: User; error?: string }> {
    const result = await fetchWithAuth<User>('/users', {
        method: 'POST',
        body: JSON.stringify({
            username: userData.username,
            password: userData.password,
            name: userData.name,
            role: userData.role,
            policeStation: userData.policeStation,
            employeeNumber: userData.employeeNumber,
        }),
    });
    return { success: result.success, user: result.data, error: result.error };
}

export async function deleteUser(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    return fetchWithAuth(`/users/${userId}`, { method: 'DELETE' });
}

// ============================================================
// CASES API
// ============================================================

export async function getAllCases(): Promise<{ success: boolean; cases?: CaseData[]; error?: string }> {
    const result = await fetchWithAuth<CaseData[]>('/cases');
    return { success: result.success, cases: result.data, error: result.error };
}

export async function getCaseById(
    id: string
): Promise<{ success: boolean; caseData?: CaseData; error?: string }> {
    const result = await fetchWithAuth<CaseData>(`/cases/${id}`);
    return { success: result.success, caseData: result.data, error: result.error };
}

export async function createCase(
    caseData: CaseData
): Promise<{ success: boolean; caseData?: CaseData; error?: string }> {
    const result = await fetchWithAuth<CaseData>('/cases', {
        method: 'POST',
        body: JSON.stringify(caseData),
    });
    return { success: result.success, caseData: result.data, error: result.error };
}

export async function updateCase(
    id: string,
    caseData: Partial<CaseData>
): Promise<{ success: boolean; caseData?: CaseData; error?: string }> {
    const result = await fetchWithAuth<CaseData>(`/cases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(caseData),
    });
    return { success: result.success, caseData: result.data, error: result.error };
}

export async function deleteCase(
    id: string
): Promise<{ success: boolean; error?: string }> {
    return fetchWithAuth(`/cases/${id}`, { method: 'DELETE' });
}

export async function searchCases(
    query: string
): Promise<{ success: boolean; cases?: CaseData[]; error?: string }> {
    const result = await fetchWithAuth<CaseData[]>(`/cases/search?q=${encodeURIComponent(query)}`);
    return { success: result.success, cases: result.data, error: result.error };
}

export interface BulkUploadResult {
    inserted: number;
    updated: number;
    errors: { row: number; error: string }[];
    total: number;
}

export async function bulkUploadCases(
    cases: CaseData[]
): Promise<{ success: boolean; data?: BulkUploadResult; error?: string }> {
    const result = await fetchWithAuth<BulkUploadResult>('/cases/bulk-upload', {
        method: 'POST',
        body: JSON.stringify({ cases }),
    });
    return { success: result.success, data: result.data, error: result.error };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function isAuthenticated(): boolean {
    return !!getAccessToken();
}

export function getStoredUserSync(): User | null {
    return getStoredUser();
}

export { clearTokens };
