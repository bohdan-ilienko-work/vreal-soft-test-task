import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Проверяем, не истёк ли токен
      secretOrKey: process.env.JWT_REFRESH_SECRET, // Секретный ключ для проверки refresh токена
    });
  }

  async validate(payload: any) {
    return { userId: payload.userId };
  }
}
