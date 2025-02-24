import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as archiver from 'archiver';
import { Archiver, Format } from 'archiver';
import { InjectRepository } from '@nestjs/typeorm';
import { Folder } from './entities/folder.entity';
import { Repository } from 'typeorm';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CloneFolderType } from './dto/clone-folder-config.dto';
import { File } from 'src/files/entities/file.entity';
import { FilesService } from 'src/files/files.service';
import { SendArchiveViaEmailDto } from './dto/send-archive-via-email.dto';
import { MailService } from 'src/mail/mail.service';
import { SharingService } from 'src/sharing/sharing.service';
import { AccessType } from 'src/core';
import { UpdateSharedFolderDto } from './dto/update-shared-folder.dto';
import { SharingAccessType } from 'src/sharing/entities/sharing.entity';
import { UpdateFolderOrderDto } from './dto/update-folder-order.dto';

@Injectable()
export class FoldersService {
  constructor(
    // Inject the repository
    @InjectRepository(Folder)
    private readonly foldersRepository: Repository<Folder>,
    @Inject(forwardRef(() => FilesService))
    private readonly filesService: FilesService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => SharingService))
    private readonly sharingService: SharingService,
  ) {}

  async calculateFolderOrder(userId: string, parentId?: string) {
    const folders = await this.foldersRepository.find({
      where: {
        user: { id: userId },
        ...(parentId && { parent: { id: parentId } }),
      },
      order: { order: 'DESC' },
    });

    return folders.length ? folders[0].order + 1 : 1;
  }

  async createFolder(userId: string, createFolderDto: CreateFolderDto) {
    const { name, parentId } = createFolderDto;

    const resolvedParent = parentId
      ? await this.findById(parentId)
      : await this.foldersRepository.findOne({
          where: { user: { id: userId }, name: 'root' },
        });

    if (parentId && !resolvedParent) {
      throw new NotFoundException('Parent folder not found');
    }

    const order = await this.calculateFolderOrder(userId, parentId);

    return this.foldersRepository.save({
      name,
      order,
      user: { id: userId },
      ...(resolvedParent && { parent: { id: resolvedParent.id } }),
    });
  }

  createRootFolder(userId: string) {
    return this.foldersRepository.save({
      name: 'root',
      order: 1,
      user: { id: userId },
    });
  }

  findById(id: string) {
    return this.foldersRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  findRootFolder(userId: string) {
    return this.foldersRepository.findOne({
      where: { user: { id: userId }, name: 'root' },
    });
  }

  //TODO: need to be tested
  async getFoldersTree(userId: string) {
    const query = `
      WITH RECURSIVE folder_tree AS (
        SELECT 
          f.id, f.name, f."parentId", f."userId", f."accessType", f."order"
        FROM folder f
        WHERE f."userId" = $1 AND f."parentId" IS NULL
        UNION ALL
        SELECT 
          f.id, f.name, f."parentId", f."userId", f."accessType", f."order"
        FROM folder f
        INNER JOIN folder_tree ft ON f."parentId" = ft.id
      )
      SELECT 
        ft.id,
        ft.name,
        ft."parentId",
        ft."userId",
        ft."accessType",
        ft."order",
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', fi.id,
            'name', fi.name,
            'accessType', fi."accessType",
            'order', fi."order"
          ) ORDER BY fi."order"
        ) FILTER (WHERE fi.id IS NOT NULL), '[]'::json) AS files
      FROM folder_tree ft
      LEFT JOIN file fi ON fi."folderId" = ft.id
      GROUP BY ft.id, ft.name, ft."parentId", ft."userId", ft."accessType", ft."order"
      ORDER BY ft."order";
    `;

    const rawFolders = (await this.foldersRepository.query(query, [
      userId,
    ])) as (Folder & {
      parentId: string | null;
      files: File[];
      order: number;
    })[];

    // Map folders by id for faster access
    const folderMap = new Map<
      string,
      Folder & { children: Folder[]; files: File[] }
    >();

    rawFolders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        files: folder.files
          ? folder.files.sort((a, b) => a.order - b.order)
          : [],
      });
    });

    const rootFolders: (Folder & { children: Folder[]; files: File[] })[] = [];

    rawFolders.forEach((folder) => {
      const mappedFolder = folderMap.get(folder.id);
      if (!mappedFolder) return;

      if (folder.parentId) {
        const parentFolder = folderMap.get(folder.parentId);
        if (parentFolder) {
          parentFolder.children.push(mappedFolder);
          parentFolder.children.sort((a, b) => a.order - b.order);
        }
      } else {
        rootFolders.push(mappedFolder);
      }
    });

    return rootFolders;
  }

  // Get folder with children tree and files
  async getFolder(
    userId: string,
    folderId: string,
  ): Promise<Folder & { children: Folder[]; files: File[] }> {
    const query = `
    WITH RECURSIVE folder_tree AS (
      SELECT 
        f.id, f.name, f."parentId", f."userId", f."accessType", f."order"
      FROM folder f
      WHERE f."id" = $1 AND f."userId" = $2
      UNION ALL
      SELECT 
        f.id, f.name, f."parentId", f."userId", f."accessType", f."order"
      FROM folder f
      INNER JOIN folder_tree ft ON f."parentId" = ft.id
    )
    SELECT 
      ft.id,
      ft.name,
      ft."parentId",
      ft."userId",
      ft."accessType",
      ft."order",
      COALESCE(json_agg(
        DISTINCT jsonb_build_object(
          'id', fi.id,
          'name', fi.name,
          'accessType', fi."accessType",
          'order', fi."order"
        ) ORDER BY fi."order"
      ) FILTER (WHERE fi.id IS NOT NULL), '[]'::json) AS files
    FROM folder_tree ft
    LEFT JOIN file fi ON fi."folderId" = ft.id
    GROUP BY ft.id, ft.name, ft."parentId", ft."userId", ft."accessType", ft."order"
    ORDER BY ft."order";
  `;

    const rawFolders = (await this.foldersRepository.query(query, [
      folderId,
      userId,
    ])) as (Folder & {
      parentId: string | null;
      files: File[];
      order: number;
    })[];

    if (!rawFolders.length) {
      throw new NotFoundException(`Folder with id ${folderId} not found`);
    }

    // Map folders by id for faster access
    const folderMap = new Map<
      string,
      Folder & { children: Folder[]; files: File[] }
    >();

    rawFolders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        files: folder.files
          ? folder.files.sort((a, b) => a.order - b.order)
          : [],
      });
    });

    // Create folder tree
    let rootFolder: (Folder & { children: Folder[]; files: File[] }) | null =
      null;

    rawFolders.forEach((folder) => {
      const mappedFolder = folderMap.get(folder.id);
      if (!mappedFolder) return;

      if (folder.parentId) {
        const parentFolder = folderMap.get(folder.parentId);
        if (parentFolder) {
          parentFolder.children.push(mappedFolder);
          parentFolder.children.sort((a, b) => a.order - b.order);
        }
      } else {
        rootFolder = mappedFolder;
      }
    });

    return rootFolder!;
  }

  async getSharedFolder(userId: string, folderId: string) {
    const sharing = await this.sharingService.getSharingForUserToFolder(
      userId,
      folderId,
    );

    const folder = await this.getFolder(sharing.sharedBy.id, folderId);

    const filterFolder = async (folder: Folder) => {
      folder.children = folder.children.filter(
        (child) => child.accessType !== AccessType.PRIVATE,
      );
      folder.files = folder.files.filter(
        (file) => file.accessType !== AccessType.PRIVATE,
      );

      const presignedUrls = await this.filesService.getPresignedUrls(
        folder.files.map((file) => file.id),
      );

      folder.files = folder.files.map((file) => {
        const presignedUrl = presignedUrls.find(
          (presigned) => presigned.fileId === file.id,
        );
        return { ...file, presignedUrl: presignedUrl?.presignedUrl };
      });

      for (const child of folder.children) {
        await filterFolder(child);
      }
    };

    await filterFolder(folder);

    return folder;
  }

  async updateSharedFolder(
    userId: string,
    folderId: string,
    updateSharedFolderDto: UpdateSharedFolderDto,
  ) {
    const sharing = await this.sharingService.getSharingForUserToFolder(
      userId,
      folderId,
    );

    if (sharing.accessType !== SharingAccessType.WRITE) {
      throw new ForbiddenException('Forbidden access');
    }

    const folder = await this.findById(folderId);

    return this.foldersRepository.save(
      Object.assign(folder!, updateSharedFolderDto),
    );
  }

  async sendArchiveViaEmail(
    userId: string,
    folderId: string,
    sendArchiveViaEmailDto: SendArchiveViaEmailDto,
  ) {
    const { email, archiveType, useHtml } = sendArchiveViaEmailDto as {
      email: string;
      archiveType: Format;
      useHtml: boolean;
    };

    const folderTree = await this.getFolder(userId, folderId);

    // Create archive buffer
    const archive: Archiver = archiver(archiveType, { zlib: { level: 9 } });
    const archiveBuffer = await new Promise<Buffer>((resolve, reject) => {
      const buffers: Buffer[] = [];

      archive.on('data', (data) => buffers.push(data));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', (err: Error) => reject(err));

      // Recursive function to add files to archive
      const addFilesToArchive = async (folder: Folder, parentPath = '') => {
        const folderPath = parentPath
          ? `${parentPath}/${folder.name}`
          : folder.name;

        if (folder.files.length === 0 && folder.children.length === 0) {
          archive.append('', { name: `${folderPath}/` }); // Add empty folder
        }

        for (const file of folder.files) {
          const fileStream = await this.filesService.getFileStream(
            file.id,
            file.name,
          );
          if (fileStream) {
            archive.append(fileStream, { name: `${folderPath}/${file.name}` });
          }
        }

        for (const childFolder of folder.children) {
          await addFilesToArchive(childFolder, folderPath);
        }
      };

      addFilesToArchive(folderTree)
        .then(() => archive.finalize())
        .catch((err: Error) => reject(err));
    });

    // Send email with archive
    await this.mailService.sendMail({
      to: email,
      subject: `Archive of folder ${folderTree.name}`,
      text: useHtml ? undefined : `Please find the requested archive attached.`,
      html: useHtml
        ? `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #333;">Folder Archive</h2>
        <p style="color: #555;">Attached is the archive of the folder <strong>${folderTree.name}</strong>.</p>
        <p style="font-size: 12px; color: #999;">If you have any issues, contact support.</p>
      </div>
    `
        : undefined,
      attachments: [
        {
          filename: `${folderTree.name}.${archiveType}`,
          content: archiveBuffer,
        },
      ],
    });

    return { message: `Archive successfully sent to ${email}` };
  }

  async getFoldersRaw(userId: string, name?: string) {
    const queryBuilder = this.foldersRepository
      .createQueryBuilder('folder')
      .leftJoinAndSelect('folder.user', 'user')
      .leftJoinAndSelect('folder.parent', 'parent')
      .leftJoinAndSelect('folder.children', 'children')
      .leftJoinAndSelect('folder.files', 'files')
      .where('folder.userId = :userId', { userId })
      .orderBy('folder.order', 'ASC')
      .addOrderBy('files.order', 'ASC');

    if (name) {
      queryBuilder.andWhere(
        `(folder.name ILIKE :name OR files.name ILIKE :name)`,
        { name: `%${name}%` },
      );
    }

    return queryBuilder.getMany();
  }

  //TODO: need to be tested
  async getFolderRaw(userId: string, folderId: string) {
    const folder = await this.foldersRepository.findOne({
      where: { id: folderId, user: { id: userId } },
      relations: ['user', 'parent', 'children', 'files'],
      order: {
        order: 'ASC',
        files: {
          order: 'ASC',
        },
      },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with id ${folderId} not found`);
    }

    return folder;
  }

  checkFolderAccess(userId: string, folder: Folder | null) {
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.user.id !== userId) {
      throw new ForbiddenException('Forbidden access');
    }
  }

  async updateFolder(
    userId: string,
    id: string,
    createFolderDto: CreateFolderDto,
  ) {
    const folder = await this.findById(id);

    this.checkFolderAccess(userId, folder);

    return this.foldersRepository.save({
      ...folder,
      ...createFolderDto,
    });
  }

  async deleteFolder(userId: string, id: string) {
    const folder = await this.findById(id);

    this.checkFolderAccess(userId, folder);

    return this.foldersRepository.remove(folder!);
  }

  async cloneFolder(
    userId: string,
    id: string,
    copyType: CloneFolderType,
  ): Promise<Folder | undefined> {
    const folder: Folder | null = await this.findById(id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    this.checkFolderAccess(userId, folder);

    switch (copyType) {
      case CloneFolderType.SIMPLE:
        return this.simpleCloneFolder(userId, folder);
      case CloneFolderType.WITH_FOLDER_STRUCTURE_AND_FILES:
        return this.cloneFolderWithStructureAndFiles(userId, folder, null);
    }
  }

  async simpleCloneFolder(userId: string, folder: Folder): Promise<Folder> {
    return this.foldersRepository.save({
      name: `${folder.name} (copy)`,
      user: { id: userId },
      parent: folder.parent ? ({ id: folder.parent.id } as Folder) : undefined,
    });
  }

  async cloneFolderWithStructureAndFiles(
    userId: string,
    folder: Folder,
    parentClone: Folder | null = null,
  ): Promise<Folder> {
    const clonedFolder: Folder = await this.foldersRepository.save({
      name: `${folder.name} (copy)`,
      user: { id: userId },
      parent: parentClone ? ({ id: parentClone.id } as Folder) : undefined,
    });

    await this.filesService.copyFilesInFolder(
      userId,
      folder.id,
      clonedFolder.id,
    );

    // Копируем дочерние папки рекурсивно
    const children: Folder[] = await this.foldersRepository.find({
      where: { parent: { id: folder.id } },
    });
    for (const child of children) {
      await this.cloneFolderWithStructureAndFiles(userId, child, clonedFolder);
    }

    return clonedFolder;
  }

  async changeFolderOrder(
    userId: string,
    folderId: string,
    updateFolderOrderDto: UpdateFolderOrderDto,
  ) {
    const { order } = updateFolderOrderDto;
    const folder = await this.findById(folderId);

    this.checkFolderAccess(userId, folder);

    const folderWithSameOrder = await this.foldersRepository.findOne({
      where: { order, parent: folder!.parent },
    });

    if (folderWithSameOrder) {
      await this.foldersRepository.update(folderWithSameOrder.id, {
        order: folder!.order,
      });
    }

    await this.foldersRepository.update(folderId, { order });

    return { message: 'Folder order successfully changed' };
  }
}
