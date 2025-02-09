import { Folder } from 'src/folders/entities/folder.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum SharingAccessType {
  READ = 'read',
  WRITE = 'write',
}

@Entity()
@Unique(['sharedBy', 'sharedWith', 'folder'])
export class Sharing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (User) => User.sharedFiles, { onDelete: 'CASCADE' })
  sharedBy: User;

  @ManyToOne(() => User, (User) => User.receivedFiles, { onDelete: 'CASCADE' })
  sharedWith: User;

  @ManyToOne(() => Folder, { onDelete: 'CASCADE' })
  folder: Folder;

  @Column({
    type: 'timestamp',
  })
  timeLimit: Date;

  @Column({
    type: 'enum',
    enum: SharingAccessType,
    default: SharingAccessType.READ,
  })
  accessType: SharingAccessType;

  @CreateDateColumn()
  createdAt: Date;
}
