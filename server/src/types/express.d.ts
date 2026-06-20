/**
 * Module augmentation: teach TypeScript that our requireAuth middleware adds
 * `userId` and `shopId` onto the Express Request. Without this, `req.userId`
 * would be a type error everywhere we use it.
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      shopId?: string;
    }
  }
}

export {};
