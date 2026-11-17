import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  commentInputSchema,
  commentModerationSchema,
  openApiRef,
} from '@sfl/schemas';
import type { CommentInput, CommentModeration } from '@sfl/schemas';

import { Public } from 'src/shared/decorators/public.decorator';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { ObjectIdPipe } from 'src/shared/pipes/object-id.pipe';
import { CommentsService } from './comments.service';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  // Open to visitors; the rate per address is limited by the `comment-ip` throttler
  @Public()
  @Post()
  async create(
    @Body(new ZodValidationPipe(commentInputSchema)) input: CommentInput,
  ) {
    return await this.comments.create(input);
  }

  @Public()
  @Get()
  @ApiQuery({ name: 'gameId', required: true, type: String })
  @ApiOkResponse({ schema: { type: 'array', items: openApiRef('Comment') } })
  async find(@Query('gameId') gameId?: string) {
    if (!gameId || !/^[0-9a-f]{24}$/i.test(gameId)) {
      throw new BadRequestException('gameId is required');
    }
    return await this.comments.findApproved(gameId);
  }

  // Admin only by default: the queue of comments to review (declared before ':id')
  @Get('queue')
  @ApiOkResponse({ schema: { type: 'array', items: openApiRef('Comment') } })
  async queue() {
    return await this.comments.queue();
  }

  @Patch(':id')
  async moderate(
    @Param('id', ObjectIdPipe) id: string,
    @Body(new ZodValidationPipe(commentModerationSchema))
    input: CommentModeration,
  ) {
    return await this.comments.moderate(id, input);
  }

  @Delete(':id')
  async delete(@Param('id', ObjectIdPipe) id: string) {
    return await this.comments.delete(id);
  }
}
