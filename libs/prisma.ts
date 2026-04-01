import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';

const prisma = new PrismaClient();

export { prisma };
export type { User, Seller, Shop } from './generated/prisma/client';
export type { Prisma } from './generated/prisma/client';
