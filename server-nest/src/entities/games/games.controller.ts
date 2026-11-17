import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { gameRevokeSchema, openApiRef } from '@sfl/schemas';
import type { Request } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ObjectIdPipe } from 'src/shared/pipes/object-id.pipe';
import { EnumRole } from '../roles/constants';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { SaveGameDTO, UpdateGameDTO } from './game.dto';
import { EnumGameStatus, IGame } from './game.schema';
import {
  DEFAULT_GAMES_LIMIT,
  GamesService,
  MAX_GAMES_LIMIT,
} from './games.service';

/** Admins and moderators work with drafts; everybody else sees only published games (S10.35). */
const canSeeDrafts = (req: Request): boolean =>
  ((req as { user?: { roles?: string[] } }).user?.roles ?? []).some(role =>
    [EnumRole.Admin, EnumRole.Moderator].includes(role as EnumRole),
  );

const accountOf = (req: Request): string =>
  String((req as { user?: { _id?: string } }).user?._id);

/** Who confirmed and why a game was revoked is for the people who work with the game. */
function present(game: object | null, privileged: boolean) {
  if (!game) return game;
  const json = (
    'toJSON' in game && typeof game.toJSON === 'function' ? game.toJSON() : game
  ) as Record<string, unknown>;
  if (privileged) return json;
  const { confirmations, revoked, lock, ...rest } = json;
  void confirmations;
  void revoked;
  void lock;
  return rest;
}

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Public()
  @Get()
  @ApiQuery({
    name: 'number',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'season',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: `The newest first: 1 to ${MAX_GAMES_LIMIT}, ${DEFAULT_GAMES_LIMIT} when no season is given`,
  })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get all games records',
  })
  async find(
    @Query('number', new ParseIntPipe({ optional: true }))
    number?: number | undefined,
    @Query('season', new ParseIntPipe({ optional: true }))
    season?: number | undefined,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit?: number | undefined,
    @Query('offset', new ParseIntPipe({ optional: true }))
    offset?: number | undefined,
    @Req() req?: Request,
  ) {
    if (
      (limit !== undefined && (limit < 1 || limit > MAX_GAMES_LIMIT)) ||
      (offset !== undefined && offset < 0)
    ) {
      throw new BadRequestException(
        `limit is from 1 to ${MAX_GAMES_LIMIT}, offset is not negative`,
      );
    }

    const privileged = canSeeDrafts(req!);
    const games = await this.gamesService.find(
      {
        ...(number ? { number } : null),
        ...(season ? { season } : null),
        // The public list is the published games (S10.35)
        ...(privileged ? null : { status: EnumGameStatus.Published }),
      },
      { limit, offset },
    );
    return games.map(game => present(game, privileged));
  }

  // The deleted games (S10.2): admin only by default; before ':id'
  @Get('deleted')
  async deleted() {
    return (await this.gamesService.findDeleted()).map(game =>
      present(game, true),
    );
  }

  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get one game by id',
  })
  async findById(
    @Param('id')
    id: string,
    @Req() req: Request,
  ) {
    const privileged = canSeeDrafts(req);
    const game = await this.gamesService.findById(id);
    // A deleted game and, for the public, a draft do not exist
    if (!game || (!privileged && game.status !== EnumGameStatus.Published)) {
      throw new NotFoundException('Game is not found');
    }
    return present(game, privileged);
  }

  @Post()
  @ApiBody({ schema: openApiRef('GameInput') })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The record has been successfully created.',
  })
  @UsePipes(new ZodValidationPipe(SaveGameDTO))
  async save(@Body() game: IGame) {
    return await this.gamesService.create(game);
  }

  @Patch(':id')
  @ApiBody({ schema: openApiRef('GameUpdateInput') })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The record has been partially updated',
  })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGameDTO)) game: IGame,
    @Req() req: Request,
    @Headers('if-match') ifMatch?: string,
  ) {
    return present(
      await this.gamesService.update(id, game, {
        accountId: accountOf(req),
        ifMatch,
      }),
      true,
    );
  }

  @Put(':id')
  @ApiBody({ schema: openApiRef('GameInput') })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully replaced',
  })
  async replace(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SaveGameDTO)) game: IGame,
    @Req() req: Request,
    @Headers('if-match') ifMatch?: string,
  ) {
    return present(
      await this.gamesService.replace(id, game, {
        accountId: accountOf(req),
        ifMatch,
      }),
      true,
    );
  }

  // The lease of a game (S10.54, ADR 0015): take or renew, release. Admin only by default.
  @Post(':id/lock')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'The game with the lease; 409 with the name of the editor if it is taken',
  })
  async lock(@Param('id', ObjectIdPipe) id: string, @Req() req: Request) {
    return present(await this.gamesService.lock(id, accountOf(req)), true);
  }

  @Delete(':id/lock')
  async unlock(@Param('id', ObjectIdPipe) id: string, @Req() req: Request) {
    return await this.gamesService.unlock(id, accountOf(req));
  }

  // The confirmation of a draft: two different people publish it (S10.35, GLOSSARY)
  @Post(':id/confirm')
  @Roles(EnumRole.Admin, EnumRole.Moderator)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The game with the confirmation; the second one publishes it',
  })
  async confirm(@Param('id', ObjectIdPipe) id: string, @Req() req: Request) {
    return present(await this.gamesService.confirm(id, accountOf(req)), true);
  }

  @Delete(':id/confirm')
  @Roles(EnumRole.Admin, EnumRole.Moderator)
  async unconfirm(@Param('id', ObjectIdPipe) id: string, @Req() req: Request) {
    return present(await this.gamesService.unconfirm(id, accountOf(req)), true);
  }

  // Admin only by default: the publication goes back to a draft, the reason is kept
  @Post(':id/revoke')
  @ApiBody({ schema: openApiRef('GameRevoke') })
  async revoke(
    @Param('id', ObjectIdPipe) id: string,
    @Body(new ZodValidationPipe(gameRevokeSchema))
    { reason }: { reason: string },
    @Req() req: Request,
  ) {
    return present(
      await this.gamesService.revoke(id, accountOf(req), reason),
      true,
    );
  }

  @Post(':id/restore')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The deleted game as a draft; two confirmations publish it',
  })
  async restore(@Param('id', ObjectIdPipe) id: string) {
    return present(await this.gamesService.restore(id), true);
  }

  @Delete(':id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The record has been successfully deleted',
  })
  async delete(@Param('id') id: string) {
    return await this.gamesService.delete(id);
  }
}
