import { Router } from 'express';
import { getCurrentUser, loginUser, registerUser } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateLogin, validateRegistration } from './auth.validation.js';

const router = Router();

router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);
router.get('/me', authenticate, getCurrentUser);

export default router;
