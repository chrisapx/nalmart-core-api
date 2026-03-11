import { Router } from 'express';
import {
  getPolicyFeatures,
  upsertPolicyFeature,
  deletePolicyFeature,
} from '../controllers/store.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// Public endpoints
router.get('/policy-features', getPolicyFeatures);

// Protected endpoints (admin only)
router.post(
  '/policy-features',
  authenticate,
  authorize(['admin']),
  upsertPolicyFeature
);

router.delete(
  '/policy-features/:id',
  authenticate,
  authorize(['admin']),
  deletePolicyFeature
);

export default router;
