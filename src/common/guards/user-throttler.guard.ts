import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // If user is authenticated, use user ID for tracking
    if (req.user && req.user.sub) {
      return `user-${req.user.sub}`;
    }

    // Fall back to IP-based tracking for unauthenticated requests
    return super.getTracker(req);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return super.shouldSkip(context);
  }
}
