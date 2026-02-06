import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';

/**
 * Middleware factory to check if user has required role(s)
 * Role hierarchy: SP > SHO > Writer
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
            });
            return;
        }

        next();
    };
}

/**
 * Check if user can access cases from a specific police station
 * SP can access all stations
 * SHO and Writer can only access their own station
 */
export function canAccessStation(req: Request, policeStation: string): boolean {
    if (!req.user) return false;

    // SP can access all stations
    if (req.user.role === 'SP') return true;

    // Others can only access their own station
    return req.user.policeStation === policeStation;
}

/**
 * Middleware to ensure user can only access their own police station's data
 */
export function requireSameStation(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
    }

    // SP can access all stations
    if (req.user.role === 'SP') {
        next();
        return;
    }

    // For other roles, check if they're accessing their own station
    const requestedStation = req.params.station || req.body?.policeStation;

    if (requestedStation && requestedStation !== req.user.policeStation) {
        res.status(403).json({
            success: false,
            error: 'Access denied. You can only access data from your police station.'
        });
        return;
    }

    next();
}
