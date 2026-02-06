import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { logAudit, getClientIp } from '../middleware/logger.js';
import { DbUser, User, JwtPayload } from '../types/index.js';

// Convert database row to User object (without password)
function dbToUser(row: DbUser): User {
    return {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        policeStation: row.police_station,
        employeeNumber: row.employee_number,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ success: false, error: 'Username and password are required' });
            return;
        }

        // Find user by username
        const result = await pool.query<DbUser>(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            await logAudit(undefined, 'LOGIN_FAILED', 'auth', undefined, `Invalid username: ${username}`, getClientIp(req));
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }

        const dbUser = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, dbUser.password);
        if (!isValidPassword) {
            await logAudit(dbUser.id, 'LOGIN_FAILED', 'auth', undefined, 'Invalid password', getClientIp(req));
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }

        // Generate tokens
        const tokenPayload: JwtPayload = {
            userId: dbUser.id,
            username: dbUser.username,
            role: dbUser.role,
            policeStation: dbUser.police_station,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Log successful login
        await logAudit(dbUser.id, 'LOGIN_SUCCESS', 'auth', undefined, undefined, getClientIp(req));

        res.json({
            success: true,
            data: {
                user: dbToUser(dbUser),
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * POST /api/auth/logout
 * Invalidate user session (primarily client-side)
 */
export async function logout(req: Request, res: Response): Promise<void> {
    try {
        await logAudit(req.user?.userId, 'LOGOUT', 'auth', undefined, undefined, getClientIp(req));
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const result = await pool.query<DbUser>(
            'SELECT * FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        res.json({ success: true, data: dbToUser(result.rows[0]) });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            res.status(400).json({ success: false, error: 'Refresh token required' });
            return;
        }

        const payload = verifyRefreshToken(token);
        if (!payload) {
            res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
            return;
        }

        // Verify user still exists
        const result = await pool.query<DbUser>(
            'SELECT * FROM users WHERE id = $1',
            [payload.userId]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ success: false, error: 'User no longer exists' });
            return;
        }

        const dbUser = result.rows[0];
        const tokenPayload: JwtPayload = {
            userId: dbUser.id,
            username: dbUser.username,
            role: dbUser.role,
            policeStation: dbUser.police_station,
        };

        const newAccessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * PUT /api/auth/password
 * Change user password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, error: 'Current and new password are required' });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
            return;
        }

        // Get current user
        const result = await pool.query<DbUser>(
            'SELECT * FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!isValidPassword) {
            await logAudit(req.user.userId, 'PASSWORD_CHANGE_FAILED', 'auth', undefined, 'Invalid current password', getClientIp(req));
            res.status(401).json({ success: false, error: 'Current password is incorrect' });
            return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await pool.query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedPassword, req.user.userId]
        );

        await logAudit(req.user.userId, 'PASSWORD_CHANGED', 'auth', undefined, undefined, getClientIp(req));

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * PUT /api/auth/profile
 * Update user profile (name, employee number)
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const { name, employeeNumber } = req.body;

        if (!name) {
            res.status(400).json({ success: false, error: 'Name is required' });
            return;
        }

        // Update profile
        const result = await pool.query<DbUser>(
            `UPDATE users 
       SET name = $1, employee_number = COALESCE($2, employee_number), updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
            [name, employeeNumber, req.user.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        await logAudit(req.user.userId, 'PROFILE_UPDATED', 'user', req.user.userId, undefined, getClientIp(req));

        res.json({ success: true, data: dbToUser(result.rows[0]) });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
