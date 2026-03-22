import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_HOST,
  token: process.env.REDIS_PASS,
});

console.log('Redis client initialized (REST API)');

export default redis;
