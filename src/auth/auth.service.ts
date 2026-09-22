import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  JwtService,
} from '@nestjs/jwt';

import * as bcrypt
  from 'bcrypt';

import {
  UsersService,
} from '../users/users.service';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';


@Injectable()
export class AuthService {

  constructor(
    private readonly usersService:
      UsersService,

    private readonly jwtService:
      JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ) {

    const user =
      await this.usersService.create({
        nombre:
          registerDto.nombre,

        apellido:
          registerDto.apellido,

        email:
          registerDto.email,

        password:
          registerDto.password,

        ciudad:
          registerDto.ciudad,
      });

    const accessToken =
      await this.generateToken(
        user.id,
        user.email,
      );

    return {
      accessToken,

      user: {
        id:
          user.id,

        nombre:
          user.nombre,

        apellido:
          user.apellido,

        email:
          user.email,

        ciudad:
          user.ciudad,

        createdAt:
          user.createdAt,
      },
    };
  }

  async login(
    loginDto: LoginDto,
  ) {

    const user =
      await this.usersService
        .findByEmailWithPassword(
          loginDto.email,
        );

    if (!user) {
      throw new UnauthorizedException(
        'Correo o contraseña incorrectos',
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        loginDto.password,
        user.passwordHash,
      );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Correo o contraseña incorrectos',
      );
    }

    const accessToken =
      await this.generateToken(
        user.id,
        user.email,
      );

    return {
      accessToken,

      user: {
        id:
          user.id,

        nombre:
          user.nombre,

        apellido:
          user.apellido,

        email:
          user.email,

        ciudad:
          user.ciudad,

        createdAt:
          user.createdAt,
      },
    };
  }

  private generateToken(
    userId: number,
    email: string,
  ): Promise<string> {

    return this.jwtService
      .signAsync({
        sub:
          userId,

        email,
      });
  }
}