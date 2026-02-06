import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../lib/api';
import { User, AuthUser, UserRole } from '../types/User';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    updateProfile: (profileData: { name: string; employeeNumber?: string }) => Promise<{ success: boolean; error?: string }>;
    hasRole: (roles: UserRole[]) => boolean;
    getAllUsers: () => Promise<User[]>;
    createUser: (userData: Omit<AuthUser, 'id'>) => Promise<{ success: boolean; error?: string }>;
    deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        // Try to get user from local storage on initial load
        return api.getStoredUserSync();
    });
    const [isLoading, setIsLoading] = useState(true);

    // Verify authentication on mount
    useEffect(() => {
        const verifyAuth = async () => {
            if (api.isAuthenticated()) {
                try {
                    const result = await api.getCurrentUser();
                    if (result.success && result.user) {
                        setUser(result.user);
                    } else {
                        // Token is invalid, clear it
                        api.clearTokens();
                        setUser(null);
                    }
                } catch {
                    // Server might be down, keep the stored user
                    console.warn('Could not verify authentication with server');
                }
            }
            setIsLoading(false);
        };

        verifyAuth();
    }, []);

    const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const result = await api.login(username, password);

            if (result.success && result.user) {
                setUser(result.user);
                setIsLoading(false);
                return { success: true };
            }

            setIsLoading(false);
            return { success: false, error: result.error || 'Invalid username or password' };
        } catch (err) {
            console.error('Login error:', err);
            setIsLoading(false);
            return { success: false, error: 'Login failed. Please check if the server is running.' };
        }
    };

    const logout = async () => {
        await api.logout();
        setUser(null);
    };

    const changePassword = async (
        currentPassword: string,
        newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        if (newPassword.length < 8) {
            return { success: false, error: 'New password must be at least 8 characters' };
        }

        try {
            const result = await api.changePassword(currentPassword, newPassword);
            return result;
        } catch (err) {
            console.error('Change password error:', err);
            return { success: false, error: 'Failed to change password' };
        }
    };

    const hasRole = (roles: UserRole[]): boolean => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    const getAllUsers = async (): Promise<User[]> => {
        try {
            const result = await api.getAllUsers();
            if (result.success && result.users) {
                return result.users;
            }
            return [];
        } catch (err) {
            console.error('Error fetching users:', err);
            return [];
        }
    };

    const createUser = async (userData: Omit<AuthUser, 'id'>): Promise<{ success: boolean; error?: string }> => {
        if (!user || user.role !== 'SP') {
            return { success: false, error: 'Unauthorized. Only SP can create users.' };
        }

        try {
            const result = await api.createUser(userData);
            return result;
        } catch (err) {
            console.error('Error creating user:', err);
            return { success: false, error: 'Failed to create user' };
        }
    };

    const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
        if (!user || user.role !== 'SP') {
            return { success: false, error: 'Unauthorized. Only SP can delete users.' };
        }

        if (userId === user.id) {
            return { success: false, error: 'Cannot delete your own account' };
        }

        try {
            const result = await api.deleteUser(userId);
            return result;
        } catch (err) {
            console.error('Error deleting user:', err);
            return { success: false, error: 'Failed to delete user' };
        }
    };

    const updateProfile = async (profileData: { name: string; employeeNumber?: string }): Promise<{ success: boolean; error?: string }> => {
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const result = await api.updateProfile(profileData.name, profileData.employeeNumber);

            if (result.success && result.user) {
                setUser(result.user);
                return { success: true };
            }

            return { success: false, error: result.error || 'Failed to update profile' };
        } catch (err) {
            console.error('Error updating profile:', err);
            return { success: false, error: 'Failed to update profile' };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                changePassword,
                updateProfile,
                hasRole,
                getAllUsers,
                createUser,
                deleteUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
