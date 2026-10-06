import { handle } from '@hono/node-server/vercel';
import app from '../dist/app.mjs';
export const maxDuration=300;
export default handle(app);