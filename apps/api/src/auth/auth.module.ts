import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // jsonwebtoken accepts ms-strings like "7d"; its types only accept ms StringValue,
        // which the ConfigService produces as `string`.
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '7d';
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: { expiresIn: expiresIn as unknown as number },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}