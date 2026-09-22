import { User } from 'src/users/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type WasteCategory =
  | 'plastico'
  | 'lata'
  | 'vidrio'
  | 'papel'
  | 'carton'
  | 'desconocido';

export type RecyclingStatus =
  | 'apto'
  | 'no_apto'
  | 'desconocido';

@Entity('historico_scan')
export class historicoScanEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  categoria: WasteCategory;

  @Column({
    type: 'varchar',
    length: 150,
  })
  objeto: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  material: string;

  @Column({
    type: 'boolean',
  })
  reciclable: boolean;

  @Column({
    type: 'varchar',
    length: 20,
  })
  estado: RecyclingStatus;

  @Column({
    type: 'int',
  })
  confianza: number;

  @Column({
    type: 'simple-json',
  })
  preparacion: string[];

  @Column({
    type: 'text',
  })
  observacion: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt: Date;

  @ManyToOne(
    () => User,
    {
      nullable: true,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

}