const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(req, res, next) {
  const { name, email, password } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }
  if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  req.authInput = { name: name.trim(), email: normalizedEmail, password };
  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !emailPattern.test(normalizedEmail) || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, message: 'A valid email and password are required.' });
  }

  req.authInput = { email: normalizedEmail, password };
  next();
}
