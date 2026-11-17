import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { CommentInput, CommentModeration } from '@sfl/schemas';
import { Model, Types } from 'mongoose';

import { Game, IGame } from '../games/game.schema';
import { Comment } from './comment.schema';

/** A list of comments is capped: the newest first. */
const LIST_LIMIT = 200;

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly model: Model<Comment>,
    @InjectModel(Game.name) private readonly games: Model<IGame>,
  ) {}

  async create({ gameId, name, text }: CommentInput) {
    if (!(await this.games.exists({ _id: gameId }))) {
      throw new NotFoundException('The game is not found');
    }
    // The status is always "pending": a visitor cannot publish by himself
    const created = await this.model.create({
      gameId: new Types.ObjectId(gameId),
      authorName: name,
      text,
    });
    return created.toJSON();
  }

  /** What everybody may read: only the approved ones, oldest first as in a conversation. */
  async findApproved(gameId: string) {
    const comments = await this.model
      .find({ gameId: new Types.ObjectId(gameId), status: 'approved' })
      .sort({ createdAt: 1 })
      .limit(LIST_LIMIT)
      .exec();
    return comments.map(comment => comment.toJSON());
  }

  async queue() {
    const comments = await this.model
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(LIST_LIMIT)
      .exec();
    return comments.map(comment => comment.toJSON());
  }

  async moderate(id: string, { status }: CommentModeration) {
    const comment = await this.model
      .findByIdAndUpdate(id, { $set: { status } }, { returnDocument: 'after' })
      .exec();
    if (!comment) throw new NotFoundException('The comment is not found');
    return comment.toJSON();
  }

  async delete(id: string) {
    const comment = await this.model.findByIdAndDelete(id).exec();
    if (!comment) throw new NotFoundException('The comment is not found');
    return null;
  }
}
