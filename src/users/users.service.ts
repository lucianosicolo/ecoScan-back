import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import * as bcrypt
  from 'bcrypt';

import {
  User,
} from './users.entity';

import {
  UsersDto,
} from './users.dto';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository:
      Repository<User>,
  ) {}

  async create(
    usersDto: UsersDto,
  ): Promise<User> {

    if (
      !usersDto.nombre ||
      !usersDto.apellido ||
      !usersDto.email ||
      !usersDto.password
    ) {
      throw new BadRequestException(
        'Nombre, apellido, email y contraseña son obligatorios',
      );
    }

    const email =
      usersDto.email
        .trim()
        .toLowerCase();

    const existingUser =
      await this.findByEmail(
        email,
      );

    if (existingUser) {
      throw new ConflictException(
        'Ya existe un usuario con ese correo',
      );
    }

    const passwordHash =
      await bcrypt.hash(
        usersDto.password,
        10,
      );

    const user =
      this.userRepository.create({
        nombre:
          usersDto.nombre.trim(),

        apellido:
          usersDto.apellido.trim(),

        email,

        passwordHash,

        ciudad:
          usersDto.ciudad?.trim() ||
          null,
      });

    return this.userRepository.save(
      user,
    );
  }

  async findAll():
    Promise<User[]> {

    return this.userRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(
    id: number,
  ): Promise<User> {

    const user =
      await this.userRepository.findOne({
        where: {
          id,
        },
      });

    if (!user) {
      throw new NotFoundException(
        `No se encontró el usuario con id ${id}`,
      );
    }

    return user;
  }

  async findByEmail(
    email: string,
  ): Promise<User | null> {

    return this.userRepository.findOne({
      where: {
        email:
          email
            .trim()
            .toLowerCase(),
      },
    });
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<User | null> {

    return this.userRepository
      .createQueryBuilder(
        'user',
      )
      .addSelect(
        'user.passwordHash',
      )
      .where(
        'LOWER(user.email) = LOWER(:email)',
        {
          email:
            email.trim(),
        },
      )
      .getOne();
  }

  async update(
    id: number,
    usersDto: UsersDto,
  ): Promise<User> {

    const user =
      await this.findOne(id);

    if (
      usersDto.nombre !==
      undefined
    ) {
      user.nombre =
        usersDto.nombre.trim();
    }

    if (
      usersDto.apellido !==
      undefined
    ) {
      user.apellido =
        usersDto.apellido.trim();
    }

    if (
      usersDto.ciudad !==
      undefined
    ) {
      user.ciudad =
        usersDto.ciudad.trim() ||
        null;
    }

    if (
      usersDto.email !==
      undefined
    ) {
      const newEmail =
        usersDto.email
          .trim()
          .toLowerCase();

      const existingUser =
        await this.findByEmail(
          newEmail,
        );

      if (
        existingUser &&
        existingUser.id !== id
      ) {
        throw new ConflictException(
          'Ya existe un usuario con ese correo',
        );
      }

      user.email =
        newEmail;
    }

    if (
      usersDto.password
    ) {
      user.passwordHash =
        await bcrypt.hash(
          usersDto.password,
          10,
        );
    }

    return this.userRepository.save(
      user,
    );
  }

  async remove(
    id: number,
  ): Promise<void> {

    const user =
      await this.findOne(id);

    await this.userRepository.remove(
      user,
    );
  }
  
}