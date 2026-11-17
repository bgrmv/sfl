import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MEDIA_MAX_BYTES, mediaInputSchema, openApiRef } from '@sfl/schemas';
import type { MediaInput } from '@sfl/schemas';

import { Public } from 'src/shared/decorators/public.decorator';
import { ObjectIdPipe } from 'src/shared/pipes/object-id.pipe';
import {
  SchemaParser,
  ZodValidationPipe,
} from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { MEDIA_LIST_LIMIT, MediaService } from './media.service';

/** A form field or a query parameter that is empty means "none" (null). */
function emptyToNull(schema: SchemaParser): SchemaParser {
  return {
    safeParse: value =>
      schema.safeParse(
        Object.fromEntries(
          Object.entries((value ?? {}) as Record<string, unknown>).map(
            ([key, field]) => [
              key,
              field === '' && key !== 'caption' ? null : field,
            ],
          ),
        ),
      ),
  };
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  // Admin only by default (S10.19). The fields come with the file, as strings:
  // an empty string means "none".
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string', maxLength: 200 },
        gameId: { type: 'string' },
        playerId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MEDIA_MAX_BYTES, files: 1 },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(emptyToNull(mediaInputSchema)))
    input: MediaInput,
  ) {
    return await this.media.create(file?.buffer, input);
  }

  @Public()
  @Get()
  @ApiQuery({ name: 'gameId', required: false, type: String })
  @ApiQuery({ name: 'playerId', required: false, type: String })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '1 to 200, 60 by default',
  })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiOkResponse({ schema: { type: 'array', items: openApiRef('Media') } })
  async find(
    @Query(new ZodValidationPipe(emptyToNull(mediaInputSchema)))
    query: MediaInput,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    if (
      (limit !== undefined && (limit < 1 || limit > MEDIA_LIST_LIMIT)) ||
      (offset !== undefined && offset < 0)
    ) {
      throw new BadRequestException(
        `limit is from 1 to ${MEDIA_LIST_LIMIT}, offset is not negative`,
      );
    }

    return await this.media.find({
      gameId: query.gameId ?? undefined,
      playerId: query.playerId ?? undefined,
      limit,
      offset,
    });
  }

  // Raw bytes, not `{ ok, data }`: the page puts the address into <img src>
  @Public()
  @Get(':id/file')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async file(@Param('id', ObjectIdPipe) id: string) {
    const { stream, mime, size } = await this.media.openFile(id);
    return new StreamableFile(stream, { type: mime, length: size });
  }

  @Patch(':id')
  async update(
    @Param('id', ObjectIdPipe) id: string,
    @Body(new ZodValidationPipe(mediaInputSchema)) input: MediaInput,
  ) {
    return await this.media.update(id, input);
  }

  @Delete(':id')
  async delete(@Param('id', ObjectIdPipe) id: string) {
    return await this.media.delete(id);
  }
}
