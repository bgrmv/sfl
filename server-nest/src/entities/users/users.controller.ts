import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ValibotValidationPipe } from 'src/shared/pipes/custom-pipe/valibot-validation.pipe';
import {
  UpdateTestUsersDto,
  UpdateTestUsersDtoInput,
  UpdateTestUsersDtoOutput,
} from './users.dto';
import { IUser } from './users.schema';
import { UsersService } from './users.service';

@ApiTags('user')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // @Post()
  // @UsePipes(new ValidationPipe())
  // createUser(@Body() createUserDto: CreateUserDto) {
  //   console.log(createUserDto);
  //   return this.usersService.createUser(createUserDto);
  // }

  @Post('test-users')
  @UsePipes(new ValibotValidationPipe(UpdateTestUsersDto))
  updateTestUsers(
    @Body() updateUserDto: UpdateTestUsersDtoInput,
  ): any | UpdateTestUsersDtoOutput {
    // return this.usersService.getsUsers();
    return updateUserDto;
  }

  @Get()
  async getUsers(): Promise<TResponse<IUser[]>> {
    return { data: await this.usersService.getsUsers() };
  }

  // users/:id
  // @Get(':id')
  // async getUserById(@Param('id') id: string) {
  //   const isValid = mongoose.Types.ObjectId.isValid(id);
  //   if (!isValid) throw new HttpException('User not found', 404);
  //   const findUser = await this.usersService.getUserById(id);
  //   if (!findUser) throw new HttpException('User not found', 404);
  //   return findUser;
  // }

  // @Patch(':id')
  // @UsePipes(new ValidationPipe())
  // async updateUser(
  //   @Param('id') id: string,
  //   @Body() updateUserDto: UpdateUserDto,
  // ) {
  //   const isValid = mongoose.Types.ObjectId.isValid(id);
  //   if (!isValid) throw new HttpException('Invalid ID', 400);
  //   const updatedUser = await this.usersService.updateUser(id, updateUserDto);
  //   if (!updatedUser) throw new HttpException('User Not Found', 404);
  //   return updatedUser;
  // }

  // @Delete(':id')
  // async deleteUserById(@Param('id') id: string) {
  //   const isValid = mongoose.Types.ObjectId.isValid(id);
  //   if (!isValid) throw new HttpException('Invalid ID', 400);
  //   const deletedUser = await this.usersService.deleteUserById(id);
  //   if (!deletedUser) throw new HttpException('User Not Found', 404);
  //   return;
  // }
}
