import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DiscoveryService } from './discovery.service';
import { DiscoveryMaturityService } from './discovery.maturity.service';
import { DoscoveryInputService } from './doscovery.input.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveryPtTrackingService } from './discovery.pt-tracking.service';
import { DiscoveryYtTrackingService } from './discovery.yt-tracking.service';
import { DiscoveryLpPoolsService } from './discovery.lp-pools.service';

@Module({
  imports: [HttpModule.register({ timeout: 20_000 })],
  providers: [
    DiscoveryService,
    DiscoveryMaturityService,
    DoscoveryInputService,
    DiscoveryPtTrackingService,
    DiscoveryYtTrackingService,
    DiscoveryLpPoolsService,
    PrismaService,
  ],
  exports: [
    DiscoveryService,
    DiscoveryMaturityService,
    DoscoveryInputService,
    DiscoveryPtTrackingService,
    DiscoveryYtTrackingService,
    DiscoveryLpPoolsService,
  ],
})
export class DiscoveryModule {}
