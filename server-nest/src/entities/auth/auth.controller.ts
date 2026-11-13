import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { addDays } from 'date-fns';
import type { Request, Response } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { AuthRequiredSchema } from './auth.dto';
import { Auth } from './auth.schema';
import { AuthService } from './auth.service';

@ApiBearerAuth()
@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  @Roles() // any signed-in user
  @Get('whoami')
  whoami(@Req() req: Request) {
    return (req as any)?.user;
  }

  @Public()
  @Post('sign-in')
  @ApiBody({
    type: Auth,
    description: 'auth model',
    required: true,
  })
  @UsePipes(new ZodValidationPipe(AuthRequiredSchema))
  async signIn(@Res() res: Response, @Body() auth: Auth) {
    const { accessToken, refreshToken } = await this.authService.signIn(auth);

    // Set cookie refreshToken
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      expires: addDays(new Date(), 1),
      sameSite: true,
    });

    // It makes header Content-Type: application/json
    return res.json({ accessToken });
  }

  @Public()
  @Post('sign-out')
  @ApiResponse({
    status: 200,
    description: 'sign out (reset tokens)',
  })
  signOut(@Res() res: Response) {
    res.cookie('refreshToken', null, {
      httpOnly: true,
      expires: new Date(),
      sameSite: true,
    });

    // It makes header Content-Type: application/json
    return res.json({ accessToken: null });
  }
}
