import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import {
    getAllCases,
    getCaseById,
    createCase,
    updateCase,
    deleteCase,
    searchCases,
    bulkUpsertCases,
} from '../controllers/caseController.js';

const router = Router();

// All case routes require authentication
router.use(authenticateToken);

// Search endpoint
router.get('/search', searchCases);

// Bulk upload endpoint (Excel data)
router.post('/bulk-upload', requireRole('Writer', 'SHO', 'SP'), bulkUpsertCases);

// CRUD endpoints
router.get('/', getAllCases);
router.get('/:id', getCaseById);
router.post('/', requireRole('Writer', 'SHO', 'SP'), createCase);
router.put('/:id', requireRole('Writer', 'SHO', 'SP'), updateCase);
router.delete('/:id', requireRole('SHO', 'SP'), deleteCase); // Only SHO and SP can delete

export default router;

