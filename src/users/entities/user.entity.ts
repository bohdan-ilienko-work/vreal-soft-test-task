import { Folder } from 'src/folders/entities/folder.entity';
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';

@Entity()
export class User {
  @PrimaryColumn({ type: 'varchar', length: 21 })
  id: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => Folder, (folder) => folder.user)
  folders: Folder[];
}
