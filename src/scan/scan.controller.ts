import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  memoryStorage,
} from 'multer';

import {
  ScanService,
} from './scan.service';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

import type {
  AuthenticatedUser,
} from '../auth/strategies/jwt.strategy';

@Controller('scan')
@UseGuards(JwtAuthGuard)
export class ScanController {

  constructor(
    private readonly scanService:
      ScanService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage:
        memoryStorage(),

      limits: {
        fileSize:
          5 * 1024 * 1024,
      },
    }),
  )
  async scanImage(

    @CurrentUser()
    user:
      AuthenticatedUser,

    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /(jpg|jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize:
            5 * 1024 * 1024,
        })
        .build({
          fileIsRequired:
            true,

          errorHttpStatusCode:
            HttpStatus
              .UNPROCESSABLE_ENTITY,
        }),
    )
    file:
      Express.Multer.File,
  ) {

    return this.scanService
      .analyzeImage(
        file,
        user.userId,
      );
  }
}