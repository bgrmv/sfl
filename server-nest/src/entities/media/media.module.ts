import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { MediaController } from './media.controller';
import { Media, MediaSchema } from './media.schema';
import { MediaService } from './media.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
  ],
  providers: [MediaService],
  controllers: [MediaController],
})
export class MediaModule {}
