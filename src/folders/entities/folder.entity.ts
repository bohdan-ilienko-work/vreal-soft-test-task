import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { File } from 'src/files/entities/file.entity';
import { AccessType } from 'src/core';
import { Sharing } from 'src/sharing/entities/sharing.entity';

@Entity()
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User, (user) => user.folders, { nullable: false })
  user: User;

  @ManyToOne(() => Folder, (folder) => folder.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  parent: Folder;

  @OneToMany(() => Folder, (folder) => folder.parent, {
    onDelete: 'CASCADE',
  })
  children: Folder[];

  @OneToMany(() => File, (file) => file.folder, {
    onDelete: 'CASCADE',
  })
  files: File[];

  @Column({
    type: 'enum',
    enum: AccessType,
    default: AccessType.PRIVATE,
  })
  accessType: AccessType;

  @OneToMany(() => Sharing, (sharing) => sharing.folder, {
    onDelete: 'CASCADE',
  })
  sharings: Sharing[];

  @Column({ type: 'int', default: 1 })
  order: number;
}
