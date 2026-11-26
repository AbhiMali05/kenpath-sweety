import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';

const passwordRounds = 12;
const placeholderSecretPattern = /^(replace|change|your|secret|example)/i;

function tokenConfiguration() {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
  if (!secret || secret.length < 32 || placeholderSecretPattern.test(secret)) {
    throw new Error('JWT_SECRET must be a non-placeholder secret of at least 32 characters.');
  }
  return { secret, expiresIn };
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

export async function register({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, passwordRounds);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return safeUser(user);
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!passwordMatches) return null;

  const { secret, expiresIn } = tokenConfiguration();
  const token = jwt.sign({ sub: String(user.id) }, secret, { expiresIn });
  return { token, expiresIn, user: safeUser(user) };
}

export async function getProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

export function isDuplicateEmail(error) {
  return error?.code === 'P2002' &&
    (error.meta?.target?.includes?.('email') || error.meta?.target === 'email');
}
