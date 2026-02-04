import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, AuthUser, MOCK_USERS, UserRole } from '../types/User';

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

const AUTH_STORAGE_KEY = 'davangere_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return null;
            }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(false);

    // Initialize database with mock users if empty
    useEffect(() => {
        const initializeUsers = async () => {
            try {
                const { data: existingUsers, error } = await supabase
                    .from('users')
                    .select('id')
                    .limit(1);

                if (error) {
                    console.log('Users table may not exist yet. Please run the schema.sql first.');
                    return;
                }

                // If no users exist, insert mock users
                if (!existingUsers || existingUsers.length === 0) {
                    const usersToInsert = MOCK_USERS.map(u => ({
                        username: u.username,
                        password: u.password,
                        name: u.name,
                        role: u.role,
                        police_station: u.policeStation,
                        employee_number: u.employeeNumber,
                    }));

                    await supabase.from('users').insert(usersToInsert);
                }
            } catch (err) {
                console.error('Error initializing users:', err);
            }
        };

        initializeUsers();
    }, []);

    const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username.toLowerCase())
                .eq('password', password)
                .single();

            if (error || !data) {
                // Fallback to local mock users if Supabase fails
                const localUser = MOCK_USERS.find(
                    u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
                );

                if (localUser) {
                    const { password: _, ...userWithoutPassword } = localUser;
                    setUser(userWithoutPassword);
                    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithoutPassword));
                    setIsLoading(false);
                    return { success: true };
                }

                setIsLoading(false);
                return { success: false, error: 'Invalid username or password' };
            }

            const loggedInUser: User = {
                id: data.id,
                username: data.username,
                name: data.name,
                role: data.role as UserRole,
                policeStation: data.police_station,
                employeeNumber: data.employee_number,
            };

            setUser(loggedInUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
            setIsLoading(false);
            return { success: true };
        } catch (err) {
            console.error('Login error:', err);
            setIsLoading(false);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    const changePassword = async (
        currentPassword: string,
        newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        if (newPassword.length < 6) {
            return { success: false, error: 'New password must be at least 6 characters' };
        }

        try {
            // Verify current password
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('password')
                .eq('id', user.id)
                .single();

            if (fetchError || !userData) {
                return { success: false, error: 'User not found' };
            }

            if (userData.password !== currentPassword) {
                return { success: false, error: 'Current password is incorrect' };
            }

            // Update password
            const { error: updateError } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('id', user.id);

            if (updateError) {
                return { success: false, error: 'Failed to update password' };
            }

            return { success: true };
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
            const { data, error } = await supabase
                .from('users')
                .select('id, username, name, role, police_station, employee_number')
                .order('created_at', { ascending: true });

            if (error || !data) {
                console.error('Error fetching users:', error);
                return MOCK_USERS.map(({ password: _, ...rest }) => rest);
            }

            return data.map(u => ({
                id: u.id,
                username: u.username,
                name: u.name,
                role: u.role as UserRole,
                policeStation: u.police_station,
                employeeNumber: u.employee_number,
            }));
        } catch (err) {
            console.error('Error fetching users:', err);
            return MOCK_USERS.map(({ password: _, ...rest }) => rest);
        }
    };

    const createUser = async (userData: Omit<AuthUser, 'id'>): Promise<{ success: boolean; error?: string }> => {
        if (!user || user.role !== 'SP') {
            return { success: false, error: 'Unauthorized' };
        }

        try {
            // Check if username already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', userData.username.toLowerCase())
                .single();

            if (existingUser) {
                return { success: false, error: 'Username already exists' };
            }

            const { error } = await supabase.from('users').insert({
                username: userData.username.toLowerCase(),
                password: userData.password,
                name: userData.name,
                role: userData.role,
                police_station: userData.policeStation,
                employee_number: userData.employeeNumber,
            });

            if (error) {
                console.error('Error creating user:', error);
                return { success: false, error: 'Failed to create user' };
            }

            return { success: true };
        } catch (err) {
            console.error('Error creating user:', err);
            return { success: false, error: 'Failed to create user' };
        }
    };

    const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
        if (!user || user.role !== 'SP') {
            return { success: false, error: 'Unauthorized' };
        }

        if (userId === user.id) {
            return { success: false, error: 'Cannot delete your own account' };
        }

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) {
                console.error('Error deleting user:', error);
                return { success: false, error: 'Failed to delete user' };
            }

            return { success: true };
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
            const { error } = await supabase
                .from('users')
                .update({
                    name: profileData.name,
                    employee_number: profileData.employeeNumber || null,
                })
                .eq('id', user.id);

            if (error) {
                console.error('Error updating profile:', error);
                return { success: false, error: 'Failed to update profile' };
            }

            // Update local state
            const updatedUser: User = {
                ...user,
                name: profileData.name,
                employeeNumber: profileData.employeeNumber || '',
            };
            setUser(updatedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));

            return { success: true };
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
