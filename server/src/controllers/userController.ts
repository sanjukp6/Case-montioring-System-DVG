import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database.js';
import { logAudit, getClientIp } from '../middleware/logger.js';
import { DbUser, User, UserRole } from '../types/index.js';

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
 * GET /api/users
 * Get all users (SP only)
 */
export async function getAllUsers(req: Request, res: Response): Promise<void> {
    try {
        const [rows] = await pool.query<(DbUser & RowDataPacket)[]>(
            'SELECT * FROM users ORDER BY created_at DESC'
        );

        const users = rows.map(dbToUser);

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * GET /api/users/:id
 * Get user by ID (SP only)
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const [rows] = await pool.query<(DbUser & RowDataPacket)[]>(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        res.json({ success: true, data: dbToUser(rows[0]) });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * POST /api/users
 * Create new user (SP only)
 */
export async function createUser(req: Request, res: Response): Promise<void> {
    try {
        const { username, password, name, role, policeStation, employeeNumber } = req.body;

        // Validate required fields
        if (!username || !password || !name || !role || !policeStation || !employeeNumber) {
            res.status(400).json({ success: false, error: 'All fields are required' });
            return;
        }

        // Validate role
        const validRoles: UserRole[] = ['Writer', 'SHO', 'SP'];
        if (!validRoles.includes(role)) {
            res.status(400).json({ success: false, error: 'Invalid role. Must be Writer, SHO, or SP' });
            return;
        }

        // Check if username already exists
        const [existingUsers] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            res.status(409).json({ success: false, error: 'Username already exists' });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const userId = uuidv4();
        await pool.query(
            `INSERT INTO users (id, username, password, name, role, police_station, employee_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, username, hashedPassword, name, role, policeStation, employeeNumber]
        );

        // Fetch created user
        const [rows] = await pool.query<(DbUser & RowDataPacket)[]>(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        await logAudit(
            req.user?.userId,
            'USER_CREATED',
            'user',
            userId,
            `Created user: ${username}`,
            getClientIp(req)
        );

        res.status(201).json({ success: true, data: dbToUser(rows[0]) });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * PUT /api/users/:id
 * Update user (SP only)
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { name, role, policeStation, employeeNumber } = req.body;

        // Validate role if provided
        if (role) {
            const validRoles: UserRole[] = ['Writer', 'SHO', 'SP'];
            if (!validRoles.includes(role)) {
                res.status(400).json({ success: false, error: 'Invalid role. Must be Writer, SHO, or SP' });
                return;
            }
        }

        await pool.query(
            `UPDATE users 
       SET name = COALESCE(?, name),
           role = COALESCE(?, role),
           police_station = COALESCE(?, police_station),
           employee_number = COALESCE(?, employee_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [name, role, policeStation, employeeNumber, id]
        );

        // Fetch updated user
        const [rows] = await pool.query<(DbUser & RowDataPacket)[]>(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        await logAudit(
            req.user?.userId,
            'USER_UPDATED',
            'user',
            id as string,
            `Updated user: ${rows[0].username}`,
            getClientIp(req)
        );

        res.json({ success: true, data: dbToUser(rows[0]) });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * DELETE /api/users/:id
 * Delete user (SP only)
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (req.user?.userId === id) {
            res.status(400).json({ success: false, error: 'Cannot delete your own account' });
            return;
        }

        // Get user info before deletion for audit log
        const [userRows] = await pool.query<(DbUser & RowDataPacket)[]>(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (userRows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        // Delete user
        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        await logAudit(
            req.user?.userId,
            'USER_DELETED',
            'user',
            id as string,
            `Deleted user: ${userRows[0].username}`,
            getClientIp(req)
        );

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
