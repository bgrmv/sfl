import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { MEDIA_MAX_BYTES, type MediaInput } from '@sfl/schemas';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Model, Types } from 'mongoose';

import { detectImageType, EXTENSIONS } from './media.signature';
import { Media } from './media.schema';

/** A list of photos is capped: the newest first. */
export const MEDIA_LIST_LIMIT = 200;

const toId = (value: string | null | undefined) =>
  value ? new Types.ObjectId(value) : null;

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly dir: string;

  constructor(
    @InjectModel(Media.name) private readonly model: Model<Media>,
    config: ConfigService,
  ) {
    this.dir = resolve(config.getOrThrow<string>('MEDIA_DIR'));
  }

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
  }

  async create(content: Buffer | undefined, input: MediaInput) {
    if (!content?.length) {
      throw new BadRequestException('A photo is required (field "file")');
    }
    if (content.length > MEDIA_MAX_BYTES) {
      throw new BadRequestException('The photo is too large');
    }
    const mime = detectImageType(content);
    if (!mime) {
      throw new BadRequestException(
        'Only JPEG, PNG and WebP photos are accepted',
      );
    }

    const file = `${randomUUID()}.${EXTENSIONS[mime]}`;
    await writeFile(join(this.dir, file), content, { flag: 'wx' });

    try {
      const created = await this.model.create({
        file,
        mime,
        size: content.length,
        caption: input.caption ?? '',
        gameId: toId(input.gameId),
        playerId: toId(input.playerId),
      });
      return created.toJSON();
    } catch (error) {
      await unlink(join(this.dir, file)).catch(() => undefined);
      throw error;
    }
  }

  async find({ gameId, playerId }: { gameId?: string; playerId?: string }) {
    const media = await this.model
      .find({
        ...(gameId ? { gameId: new Types.ObjectId(gameId) } : {}),
        ...(playerId ? { playerId: new Types.ObjectId(playerId) } : {}),
      })
      .sort({ createdAt: -1 })
      .limit(MEDIA_LIST_LIMIT)
      .exec();
    return media.map(item => item.toJSON());
  }

  async openFile(id: string) {
    const media = await this.model.findById(id).exec();
    if (!media) throw new NotFoundException('The photo is not found');
    return {
      stream: createReadStream(join(this.dir, media.file)),
      mime: media.mime,
      size: media.size,
    };
  }

  async update(id: string, input: MediaInput) {
    const $set: Record<string, unknown> = {};
    if (input.caption !== undefined) $set.caption = input.caption;
    if (input.gameId !== undefined) $set.gameId = toId(input.gameId);
    if (input.playerId !== undefined) $set.playerId = toId(input.playerId);

    const media = await this.model
      .findByIdAndUpdate(id, { $set }, { returnDocument: 'after' })
      .exec();
    if (!media) throw new NotFoundException('The photo is not found');
    return media.toJSON();
  }

  async delete(id: string) {
    const media = await this.model.findByIdAndDelete(id).exec();
    if (!media) throw new NotFoundException('The photo is not found');
    await unlink(join(this.dir, media.file)).catch(() => undefined);
    return null;
  }
}
