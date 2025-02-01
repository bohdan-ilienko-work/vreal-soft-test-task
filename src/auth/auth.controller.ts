import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { UserId } from './decorators/user-id.decorator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirect to Google login page
  }
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  //TODO: Add the correct type for the user parameter
  async googleAuthRedirect(@CurrentUser() userData: CreateUserDto) {
    return this.authService.googleLogin(userData);
  }

  @Get('protected')
  @UseGuards(AccessTokenGuard)
  async protectedRoute(@UserId() userId: number) {
    // Protected route logic
    return 'Protected route';
  }
}
