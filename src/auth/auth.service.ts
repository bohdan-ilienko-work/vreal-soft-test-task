import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FoldersService } from 'src/folders/folders.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly foldersService: FoldersService,
  ) {}

  async googleLogin(userData: { id: string; email: string }) {
    const { id, email } = userData;
    const user = await this.usersService.findById(id);

    if (!user) {
      await this.usersService.create({ id, email });
      await this.foldersService.createRootFolder(id);
    }

    return this.generateTokens(id);
  }

  generateTokens(userId: string): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload = { userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ),
    });

    return { accessToken, refreshToken };
  }
}
