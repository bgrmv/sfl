import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  // Admin only by default
  @Get()
  async latest() {
    return await this.audit.latest();
  }
}
