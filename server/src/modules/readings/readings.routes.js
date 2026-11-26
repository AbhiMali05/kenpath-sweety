import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { create, list, remove, update } from './readings.controller.js';
import { validateCreateReading, validateReadingId, validateUpdateReading } from './readings.validation.js';

const router = Router();

router.use(authenticate);
router.route('/').get(list).post(validateCreateReading, create);
router.route('/:id').put(validateUpdateReading, update).delete(validateReadingId, remove);

export default router;
