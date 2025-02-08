import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { UserId } from './decorators/user-id.decorator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

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
  async googleAuthRedirect(@CurrentUser() userData: CreateUserDto) {
    return this.authService.googleLogin(userData);
  }

  @Get('protected')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  protectedRoute(@UserId() userId: string) {
    // Protected route logic
    return `This is a protected route for user with ID: ${userId}`;
  }
}
