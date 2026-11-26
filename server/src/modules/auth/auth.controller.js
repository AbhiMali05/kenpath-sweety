import { getProfile, isDuplicateEmail, login, register } from './auth.service.js';

export async function registerUser(req, res, next) {
  try {
    const user = await register(req.authInput);
    return res.status(201).json({ success: true, message: 'Account created successfully.', data: { user } });
  } catch (error) {
    if (isDuplicateEmail(error)) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    return next(error);
  }
}

export async function loginUser(req, res, next) {
  try {
    const result = await login(req.authInput);
    if (!result) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return res.status(200).json({ success: true, message: 'Login successful.', data: result });
  } catch (error) {
    return next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await getProfile(req.auth.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Authenticated user no longer exists.' });
    return res.status(200).json({ success: true, message: 'Profile loaded successfully.', data: { user } });
  } catch (error) {
    return next(error);
  }
}
