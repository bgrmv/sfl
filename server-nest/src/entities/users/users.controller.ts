import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import {
  SetPasswordDTO,
  SetPasswordDTOOutput,
  UpdateTestUsersDto,
  UpdateTestUsersDtoInput,
  UpdateTestUsersDtoOutput,
} from './users.dto';
import { IUser } from './users.schema';
import { UsersService } from './users.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('test-users')
  @UsePipes(new ZodValidationPipe(UpdateTestUsersDto))
  updateTestUsers(
    @Body() updateUserDto: UpdateTestUsersDtoInput,
  ): any | UpdateTestUsersDtoOutput {
    // return this.usersService.getsUsers();
    return updateUserDto;
  }

  // ADMIN only (default for routes without @Roles)
  @Post(':id/password')
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

    return { success: 'OK' };
  }

  @Get()
  async getUsers(): Promise<IUser[]> {
    return await this.usersService.getsUsers();
  }
}
