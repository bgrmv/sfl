import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { userRolesInputSchema } from '@sfl/schemas';
import type { UserRolesInput } from '@sfl/schemas';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { SetPasswordDTO, SetPasswordDTOOutput } from './users.dto';
import { UsersService } from './users.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ADMIN only (default for routes without @Roles)
  @Get()
  list() {
    return this.usersService.listForAdmin();
  }

  // ADMIN only: giving roles is not for a moderator
  @Patch(':id/roles')
  async setRoles(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userRolesInputSchema))
    { roles }: UserRolesInput,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new BadRequestException('Invalid user id');
    }

    return this.usersService.setRoles(id, roles, (req as any).user._id);
  }

  // ADMIN only (default for routes without @Roles)
  @Put(':id/password')
  async setPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetPasswordDTO))
    { password }: SetPasswordDTOOutput,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new BadRequestException('Invalid user id');
    }

    if (!(await this.usersService.setPassword(id, password))) {
      throw new NotFoundException('User is not found');
    }

    return null;
  }
}
