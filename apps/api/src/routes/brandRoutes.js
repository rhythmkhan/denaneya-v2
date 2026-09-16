/**
 * DenaNeya v2.0 - Brand Management Routes
 * All brand routes are protected by authMiddleware.
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import {
  createBrand,
  listBrands,
  getBrandById,
  rotateBrandSecrets
} from '../controllers/brandController.js';

const router = Router();

// Protect all brand routes with JWT authentication
router.use(authMiddleware);

router.post('/', createBrand);
router.get('/', listBrands);
router.get('/:id', getBrandById);
router.post('/:id/rotate-secrets', rotateBrandSecrets);

export default router;
