import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PtTrackingService } from './pt-tracking.service';
import { PtTrackingController } from './pt-tracking.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PtTrackingController],
  providers: [PtTrackingService],
  exports: [PtTrackingService],
})
export class PtTrackingModule {}

