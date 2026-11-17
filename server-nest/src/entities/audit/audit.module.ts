import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../users/users.schema';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { Audit, AuditSchema } from './audit.schema';
import { AuditService } from './audit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Audit.name, schema: AuditSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [AuditService, AuditInterceptor],
  controllers: [AuditController],
  exports: [AuditInterceptor, AuditService],
})
export class AuditModule {}
