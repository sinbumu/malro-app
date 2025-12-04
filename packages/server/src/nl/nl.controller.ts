import { Body, Controller, Post } from '@nestjs/common';
import { ParseRequestDto } from './dto/parse-request.dto';
import { NlService } from './nl.service';
import { ParseResponse } from './nl.types';

@Controller('nl')
export class NlController {
  constructor(private readonly nlService: NlService) {}

  @Post('parse')
  parse(@Body() dto: ParseRequestDto): ParseResponse {
    return this.nlService.parseInput(dto);
  }
}
