import { Module, Global } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// Global module เพื่อให้ PrismaService ใช้ได้ทั่วทั้งแอพ
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
