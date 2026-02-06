import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    login,
    logout,
    getCurrentUser,
    refreshToken,
    changePassword,
    updateProfile,
} from '../controllers/authController.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getCurrentUser);
router.put('/password', authenticateToken, changePassword);
router.put('/profile', authenticateToken, updateProfile);

export default router;
