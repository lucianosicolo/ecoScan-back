import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  AuthService,
} from './auth.service';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';




@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService:
      AuthService,
  ) {}

  @Post('register')
  register(
    @Body()
    registerDto: RegisterDto,
  ) {

    return this.authService
      .register(
        registerDto,
      );
  }

  @Post('login')
  login(
    @Body()
    loginDto: LoginDto,
  ) {

    return this.authService
      .login(
        loginDto,
      );
  }
}