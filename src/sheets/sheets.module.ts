import { Module } from '@nestjs/common';
import { SheetsController } from './sheets.controller';
import { SheetsService } from './sheets.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SheetsController],
  providers: [SheetsService, PrismaService],
})
export class SheetsModule {}
