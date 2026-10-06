import { handle } from '@hono/node-server/vercel';
import app from '../src/app.ts';
export const maxDuration=300;
export default handle(app);
