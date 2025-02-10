import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Folder } from 'src/folders/entities/folder.entity';
import { AccessType } from 'src/core';

@Entity()
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Folder, (folder) => folder.files, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  folder: Folder;

  @Column({
    type: 'enum',
    enum: AccessType,
    default: AccessType.PRIVATE,
  })
  accessType: AccessType;

  @Column({ type: 'int', default: 1 })
  order: number;
}
