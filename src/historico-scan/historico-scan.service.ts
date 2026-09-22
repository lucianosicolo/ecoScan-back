import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';
import {
  unlink,
} from 'fs/promises';

import {
  join,
} from 'path';
import {
  Repository,
} from 'typeorm';

import {
  CreateHistorialDto,
} from './historico-scan.dto';

import {
  historicoScanEntity,
} from './historico-scan.entity';

import {
  UsersService,
} from '../users/users.service';

@Injectable()
export class HistorialService {

  constructor(
    @InjectRepository(
      historicoScanEntity,
    )
    private readonly historialRepository:
      Repository<historicoScanEntity>,

    private readonly usersService:
      UsersService,
  ) {}
private async deleteImage(
  imagenUrl: string | null,
): Promise<void> {

  if (!imagenUrl) {
    return;
  }

  const relativePath =
    imagenUrl.replace(
      /^\/+/,
      '',
    );

  const filePath =
    join(
      process.cwd(),
      relativePath,
    );

  try {

    await unlink(
      filePath,
    );

  } catch (error: unknown) {

    const fileError =
      error as {
        code?: string;
      };

    if (
      fileError.code === 'ENOENT'
    ) {
      return;
    }

    console.error(
      'Error eliminando imagen:',
      error,
    );
  }
}
  async create(
    createHistorialDto:
      CreateHistorialDto,

    userId: number,
  ): Promise<historicoScanEntity> {

    const user =
      await this.usersService
        .findOne(
          userId,
        );

    const historial =
      this.historialRepository
        .create({
          ...createHistorialDto,
          user,
        });

    return this.historialRepository
      .save(
        historial,
      );
  }

  async findAll(
    userId: number,
  ): Promise<historicoScanEntity[]> {

    return this.historialRepository
      .find({
        where: {
          user: {
            id: userId,
          },
        },

        order: {
          createdAt: 'DESC',
        },
      });
  }

  async findOne(
    id: number,
    userId: number,
  ): Promise<historicoScanEntity> {

    const historial =
      await this.historialRepository
        .findOne({
          where: {
            id,

            user: {
              id: userId,
            },
          },
        });

    if (!historial) {
      throw new NotFoundException(
        `No se encontró el historial con id ${id}`,
      );
    }

    return historial;
  }

async remove(
  id: number,
  userId: number,
): Promise<void> {

  const historial =
    await this.findOne(
      id,
      userId,
    );

  const imagenUrl =
    historial.imagenUrl;

  await this.historialRepository
    .remove(
      historial,
    );

  await this.deleteImage(
    imagenUrl,
  );
}
}