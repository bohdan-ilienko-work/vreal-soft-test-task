import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryColumn({ type: 'varchar', length: 21 })
  id: string;

  @Column({ unique: true })
  email: string;
}
