import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

/**
 * Log actions to the audit_logs table
 */
export async function logAudit(
    userId: string | undefined,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: string,
    ipAddress?: string
): Promise<void> {
    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId || null, action, resourceType, resourceId || null, details || null, ipAddress || null]
        );
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't throw - audit logging should not break the main flow
    }
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

/**
 * Request logging middleware - logs all requests to console
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        const userId = req.user?.userId || 'anonymous';

        console.log(
            `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms - User: ${userId}`
        );
    });

    next();
}
