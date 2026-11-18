import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator';
import { VersionService } from './version.service';

class VersionDto {
  @ApiProperty({
    example: '1.0.0',
    description: 'Version of the product, X.Y.Z',
  })
  version: string;
}

// The version of the product is public: the footer and the release notes show it
@Public()
@ApiTags('version')
@Controller('version')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @ApiOkResponse({ type: VersionDto })
  @Get()
  get(): VersionDto {
    return { version: this.versionService.version };
  }
}
