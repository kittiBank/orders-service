import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { OrdersModule } from "./orders/orders.module";

@Module({
  imports: [
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests
      },
    ]),
    PrismaModule,
    AuthModule,
    OrdersModule,
  ],
  controllers: [],
  providers: [
    // Global rate limiting (can be overridden by controller-level decorators)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
