import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigService } from '@nestjs/config';
import { Player, PlayerSchema } from '../players/players.schema';
import { StatisticsModule } from '../statistics/statistics.module';
import { Role, RoleSchema } from '../roles';
import { User, UserSchema } from '../users';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevAdminSeeder } from './dev-admin.seeder';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOidcService } from './google-oidc.service';
import { Invitation, InvitationSchema } from './invitation.schema';
import { InvitationsService } from './invitations.service';
import { OAuthState, OAuthStateSchema } from './oauth-state.schema';
import { Session, SessionSchema } from './session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Session.name,
        schema: SessionSchema,
      },
      { name: Invitation.name, schema: InvitationSchema },
      { name: OAuthState.name, schema: OAuthStateSchema },
      { name: Player.name, schema: PlayerSchema },
      {
        name: Role.name,
        schema: RoleSchema,
      },
    ]),
    StatisticsModule,
  ],

  controllers: [AuthController, GoogleAuthController],
  providers: [
    ConfigService,
    AuthService,
    GoogleOidcService,
    InvitationsService,
    GoogleAuthService,
    DevAdminSeeder,
  ],
  exports: [AuthService],
})
export class AuthModule {}
