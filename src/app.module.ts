import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { SheetsModule } from './sheets/sheets.module';
import { OutputsModule } from './outputs/outputs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    DiscoveryModule,
    SnapshotsModule,
    SheetsModule,
    OutputsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
