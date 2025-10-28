import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [HttpModule.register({ timeout: 20_000 })],
  providers: [DiscoveryService, PrismaService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
