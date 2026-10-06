import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import {
  UsersService,
} from './users.service';

import {
  UsersDto,
} from './users.dto';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

import type {
  AuthenticatedUser,
} from '../auth/strategies/jwt.strategy';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {

  constructor(
    private readonly usersService:
      UsersService,
  ) {}



  @Get(':id')
  findOne(
    @CurrentUser()
    currentUser:
      AuthenticatedUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {

    if (
      currentUser.userId !== id
    ) {
      throw new ForbiddenException(
        'No podés acceder a otro usuario',
      );
    }

    return this.usersService.findOne(
      id,
    );
  }

  @Put(':id')
  update(
    @CurrentUser()
    currentUser:
      AuthenticatedUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    usersDto: UsersDto,
  ) {

    if (
      currentUser.userId !== id
    ) {
      throw new ForbiddenException(
        'No podés modificar otro usuario',
      );
    }

    return this.usersService.update(
      id,
      usersDto,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser()
    currentUser:
      AuthenticatedUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {

    if (
      currentUser.userId !== id
    ) {
      throw new ForbiddenException(
        'No podés eliminar otro usuario',
      );
    }

    return this.usersService.remove(
      id,
    );
  }
}