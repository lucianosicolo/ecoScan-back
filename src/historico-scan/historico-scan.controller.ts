import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import {
  HistorialService,
} from './historico-scan.service';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

import type {
  AuthenticatedUser,
} from '../auth/strategies/jwt.strategy';

@Controller('historial')
@UseGuards(JwtAuthGuard)
export class HistorialController {

  constructor(
    private readonly historialService:
      HistorialService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.historialService.findAll(
      user.userId,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser()
    user: AuthenticatedUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.historialService.findOne(
      id,
      user.userId,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser()
    user: AuthenticatedUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.historialService.remove(
      id,
      user.userId,
    );
  }
}