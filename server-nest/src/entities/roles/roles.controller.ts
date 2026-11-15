import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from './roles.schema';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  @ApiBody({ type: Role })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Create a role',
  })
  async createRole(@Body() body: { name: string; description?: string }) {
    return await this.rolesService.create(body);
  }
}
