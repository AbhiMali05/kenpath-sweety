import jwt from 'jsonwebtoken';

const placeholderSecretPattern = /^(replace|change|your|secret|example)/i;

export function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  if (!authorization) {
    return res.status(401).json({ success: false, message: 'Bearer token is required.' });
  }

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Authorization header must use Bearer token format.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || placeholderSecretPattern.test(secret)) {
    return res.status(500).json({ success: false, message: 'Authentication is not configured.' });
  }

  try {
    const claims = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
    const userId = Number(claims.sub);
    if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('Invalid token subject');
    req.auth = { userId };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Bearer token is invalid or expired.' });
  }
}
