import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';

const NO_REPLICA_SET_MESSAGE =
  'MongoDB transactions need a replica set (ADR 0014). Start mongod with --replSet and run rs.initiate().';

// MongoDB: IllegalOperation, "Transaction numbers are only allowed on a replica set member or mongos"
const isNoReplicaSetError = (error: unknown): boolean =>
  (error as { code?: number })?.code === 20 &&
  /replica set|mongos/i.test((error as Error).message ?? '');

/**
 * One MongoDB transaction around several writes (ADR 0014, S3.5): either all
 * of them are committed or none. The callback may be re-run on a transient
 * error, so it must only write through the given session.
 */
@Injectable()
export class TransactionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TransactionService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /** Transactions are required, so a database without a replica set is reported at start. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const hello = await this.connection.db.admin().command({ hello: 1 });
      if (!hello.setName && hello.msg !== 'isdbgrid') {
        this.logger.error(
          `${NO_REPLICA_SET_MESSAGE} Saving a game will fail until then.`,
        );
      }
    } catch (error) {
      this.logger.warn(`Cannot check the replica set: ${String(error)}`);
    }
  }

  async run<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let result: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      if (isNoReplicaSetError(error)) {
        this.logger.error(NO_REPLICA_SET_MESSAGE);
        throw new InternalServerErrorException(
          'The database does not support transactions',
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
