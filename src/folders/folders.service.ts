import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Folder } from './entities/folder.entity';
import { Repository } from 'typeorm';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CloneFolderType } from './dto/clone-folder-config.dto';
import { File } from 'src/files/entities/file.entity';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class FoldersService {
  constructor(
    // Inject the repository
    @InjectRepository(Folder)
    private readonly foldersRepository: Repository<Folder>,
    @Inject(forwardRef(() => FilesService))
    private readonly filesService: FilesService,
  ) {}

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

    return this.foldersRepository.save({
      name,
      user: { id: userId },
      ...(resolvedParent && { parent: { id: resolvedParent.id } }),
    });
  }

  createRootFolder(userId: string) {
    return this.foldersRepository.save({
      name: 'root',
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

  async getFoldersTree(userId: string) {
    const query = `
      WITH RECURSIVE folder_tree AS (
        SELECT 
          f.id, f.name, f."parentId", f."userId", f."accessType"
        FROM folder f
        WHERE f."userId" = $1 AND f."parentId" IS NULL
        UNION ALL
        SELECT 
          f.id, f.name, f."parentId", f."userId", f."accessType"
        FROM folder f
        INNER JOIN folder_tree ft ON f."parentId" = ft.id
      )
      SELECT 
        ft.id,
        ft.name,
        ft."parentId",
        ft."userId",
        ft."accessType",
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', fi.id,
            'name', fi.name,
            'accessType', fi."accessType"
          )
        ) FILTER (WHERE fi.id IS NOT NULL), '[]'::json) AS files
      FROM folder_tree ft
      LEFT JOIN file fi ON fi."folderId" = ft.id
      GROUP BY ft.id, ft.name, ft."parentId", ft."userId", ft."accessType";
    `;

    const rawFolders = (await this.foldersRepository.query(query, [
      userId,
    ])) as (Folder & { parentId: string | null; files: File[] })[];

    // Map folders by id for faster access
    const folderMap = new Map<
      string,
      Folder & { children: Folder[]; files: File[] }
    >();

    rawFolders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        files: folder.files || [],
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
          f.id, f.name, f."parentId", f."userId", f."accessType"
        FROM folder f
        WHERE f."id" = $1 AND f."userId" = $2
        UNION ALL
        SELECT 
          f.id, f.name, f."parentId", f."userId", f."accessType"
        FROM folder f
        INNER JOIN folder_tree ft ON f."parentId" = ft.id
      )
      SELECT 
        ft.id,
        ft.name,
        ft."parentId",
        ft."userId",
        ft."accessType",
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', fi.id,
            'name', fi.name,
            'accessType', fi."accessType"
          )
        ) FILTER (WHERE fi.id IS NOT NULL), '[]'::json) AS files
      FROM folder_tree ft
      LEFT JOIN file fi ON fi."folderId" = ft.id
      GROUP BY ft.id, ft.name, ft."parentId", ft."userId", ft."accessType";
    `;

    const rawFolders = (await this.foldersRepository.query(query, [
      folderId,
      userId,
    ])) as (Folder & { parentId: string | null; files: File[] })[];

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
        files: folder.files || [],
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
        }
      } else {
        rootFolder = mappedFolder;
      }
    });

    return rootFolder!;
  }

  getFoldersRaw(userId: string) {
    return this.foldersRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'parent', 'children', 'files'],
    });
  }

  async getFolderRaw(userId: string, folderId: string) {
    const folder = await this.foldersRepository.findOne({
      where: { id: folderId, user: { id: userId } },
      relations: ['user', 'parent', 'children', 'files'],
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
}
