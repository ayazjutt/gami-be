import { Controller, Get } from '@nestjs/common';
import { SheetsService } from './sheets.service';

@Controller('sheets')
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  // @Get('inputs')
  // async getInputs() {
  //   return this.sheetsService.getInputsSheetData();
  // }
}
