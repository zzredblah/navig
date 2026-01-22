# Navig NestJS 패턴 (NestJS Patterns)

**버전:** 1.0  
**최종 수정:** 2025-01-22

---

## 1. 프로젝트 구조

### 1.1 디렉토리 구조

```
apps/api/src/
├── modules/              # 기능 모듈
│   ├── auth/
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── signup.dto.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── projects/
│   │   ├── dto/
│   │   ├── entities/
│   │   │   └── project.entity.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   └── projects.module.ts
│   └── ...
├── common/               # 공통 모듈
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── guards/
│   │   └── roles.guard.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── transform.interceptor.ts
│   └── pipes/
│       └── validation.pipe.ts
├── config/               # 설정
│   ├── database.config.ts
│   └── app.config.ts
├── app.module.ts
└── main.ts
```

---

## 2. 모듈 패턴

### 2.1 기본 모듈 구조

```typescript
// modules/projects/projects.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService], // 다른 모듈에서 사용 시
})
export class ProjectsModule {}
```

### 2.2 동적 모듈

```typescript
// modules/storage/storage.module.ts

import { Module, DynamicModule } from '@nestjs/common';
import { StorageService } from './storage.service';

interface StorageModuleOptions {
  bucket: string;
  region: string;
}

@Module({})
export class StorageModule {
  static forRoot(options: StorageModuleOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: 'STORAGE_OPTIONS',
          useValue: options,
        },
        StorageService,
      ],
      exports: [StorageService],
      global: true,
    };
  }
}
```

---

## 3. Controller 패턴

### 3.1 기본 Controller

```typescript
// modules/projects/projects.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FindProjectsDto } from './dto/find-projects.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: '프로젝트 목록 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  findAll(
    @Query() query: FindProjectsDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '프로젝트 상세 조회' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: '프로젝트 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '프로젝트 수정' })
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '프로젝트 삭제' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('owner')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.remove(id, user.id);
  }
}
```

### 3.2 중첩 리소스

```typescript
// modules/videos/videos.controller.ts

@Controller('projects/:projectId/videos')
export class VideosController {
  @Get()
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: FindVideosDto,
  ) {
    return this.videosService.findAllByProject(projectId, query);
  }

  @Post('upload/init')
  initUpload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: InitUploadDto,
    @CurrentUser() user: User,
  ) {
    return this.videosService.initUpload(projectId, dto, user);
  }
}
```

---

## 4. Service 패턴

### 4.1 기본 Service

```typescript
// modules/projects/projects.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FindProjectsDto } from './dto/find-projects.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: FindProjectsDto, userId: string) {
    const { status, page = 1, limit = 20, search } = query;

    const qb = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member')
      .where('member.userId = :userId', { userId });

    if (status) {
      qb.andWhere('project.status = :status', { status });
    }

    if (search) {
      qb.andWhere('project.title ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('project.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // 멤버 권한 확인
    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return project;
  }

  async create(dto: CreateProjectDto, user: User) {
    // 트랜잭션 사용
    return this.dataSource.transaction(async (manager) => {
      // 프로젝트 생성
      const project = manager.create(Project, {
        ...dto,
        clientId: user.id,
      });
      await manager.save(project);

      // 생성자를 owner로 추가
      const member = manager.create(ProjectMember, {
        projectId: project.id,
        userId: user.id,
        role: 'owner',
      });
      await manager.save(member);

      return project;
    });
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const project = await this.findOne(id, userId);
    
    Object.assign(project, dto);
    return this.projectRepository.save(project);
  }

  async remove(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    await this.projectRepository.remove(project);
  }
}
```

### 4.2 트랜잭션 패턴

```typescript
// 방법 1: DataSource 사용
async createWithMembers(dto: CreateWithMembersDto, user: User) {
  return this.dataSource.transaction(async (manager) => {
    const project = manager.create(Project, dto);
    await manager.save(project);
    
    const members = dto.members.map((m) =>
      manager.create(ProjectMember, { ...m, projectId: project.id })
    );
    await manager.save(members);
    
    return project;
  });
}

// 방법 2: QueryRunner 사용 (더 세밀한 제어)
async complexOperation(dto: ComplexDto) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  
  try {
    const result1 = await queryRunner.manager.save(Entity1, dto.data1);
    const result2 = await queryRunner.manager.save(Entity2, { ...dto.data2, entity1Id: result1.id });
    
    await queryRunner.commitTransaction();
    return { result1, result2 };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

---

## 5. DTO 패턴

### 5.1 기본 DTO

```typescript
// modules/projects/dto/create-project.dto.ts

import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: '프로젝트 제목',
    example: '브랜드 홍보영상',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: '프로젝트 설명',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '마감일',
    example: '2025-02-28',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
```

### 5.2 Update DTO (Partial)

```typescript
// modules/projects/dto/update-project.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsEnum(['planning', 'production', 'review', 'settlement'])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
```

### 5.3 Query DTO (페이지네이션)

```typescript
// modules/projects/dto/find-projects.dto.ts

import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindProjectsDto {
  @ApiPropertyOptional({ enum: ['planning', 'production', 'review', 'settlement'] })
  @IsOptional()
  @IsEnum(['planning', 'production', 'review', 'settlement'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

## 6. Entity 패턴

### 6.1 기본 Entity

```typescript
// modules/projects/entities/project.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from './project-member.entity';
import { VideoVersion } from '../../videos/entities/video-version.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['planning', 'production', 'review', 'settlement'],
    default: 'planning',
  })
  status: string;

  @Column({ name: 'stage_status', length: 50, nullable: true })
  stageStatus: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client: User;

  @Column({ name: 'worker_id', type: 'uuid', nullable: true })
  workerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @OneToMany(() => ProjectMember, (member) => member.project)
  members: ProjectMember[];

  @OneToMany(() => VideoVersion, (video) => video.project)
  videos: VideoVersion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 6.2 Base Entity (공통 필드)

```typescript
// common/entities/base.entity.ts

import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// 사용
@Entity('projects')
export class Project extends BaseEntity {
  // id, createdAt, updatedAt 자동 포함
  @Column()
  title: string;
}
```

---

## 7. Guard & Decorator

### 7.1 JWT Guard

```typescript
// modules/auth/guards/jwt-auth.guard.ts

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Public 엔드포인트 체크
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
```

### 7.2 Roles Guard

```typescript
// common/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectsService } from '@/modules/projects/projects.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private projectsService: ProjectsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.id || request.params.projectId;

    if (!projectId) {
      return true;
    }

    const member = await this.projectsService.getMember(projectId, user.id);
    
    if (!member) {
      return false;
    }

    return requiredRoles.includes(member.role);
  }
}
```

### 7.3 Custom Decorators

```typescript
// common/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// common/decorators/roles.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// common/decorators/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);
```

---

## 8. Exception & Filter

### 8.1 Custom Exceptions

```typescript
// common/exceptions/project-not-found.exception.ts

import { NotFoundException } from '@nestjs/common';

export class ProjectNotFoundException extends NotFoundException {
  constructor(projectId: string) {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: `Project with ID ${projectId} not found`,
    });
  }
}

// common/exceptions/forbidden-resource.exception.ts

import { ForbiddenException } from '@nestjs/common';

export class ForbiddenResourceException extends ForbiddenException {
  constructor(resource: string) {
    super({
      statusCode: 403,
      error: 'Forbidden',
      message: `You don't have permission to access this ${resource}`,
    });
  }
}
```

### 8.2 Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // 로깅
    this.logger.error(
      `${request.method} ${request.url} ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'object' ? message : { message }),
    });
  }
}
```

---

## 9. Interceptor

### 9.1 Transform Interceptor

```typescript
// common/interceptors/transform.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        message: 'Success',
      })),
    );
  }
}
```

### 9.2 Logging Interceptor

```typescript
// common/interceptors/logging.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${Date.now() - now}ms`,
        );
      }),
    );
  }
}
```

---

## 10. 파일 업로드

### 10.1 청크 업로드

```typescript
// modules/videos/videos.service.ts

import { Injectable } from '@nestjs/common';
import { S3Client, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';

@Injectable()
export class VideosService {
  private s3: S3Client;

  async initUpload(projectId: string, dto: InitUploadDto, user: User) {
    // Multipart upload 시작
    const { UploadId } = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: `projects/${projectId}/videos/${crypto.randomUUID()}`,
        ContentType: dto.contentType,
      }),
    );

    // DB에 영상 버전 레코드 생성
    const videoVersion = await this.videoRepository.save({
      projectId,
      uploadId: UploadId,
      status: 'uploading',
      uploadedBy: user.id,
    });

    return {
      videoVersionId: videoVersion.id,
      uploadId: UploadId,
      chunkSize: 10 * 1024 * 1024, // 10MB
    };
  }

  async uploadChunk(id: string, chunkIndex: number, data: Buffer) {
    const video = await this.videoRepository.findOne({ where: { id } });

    const { ETag } = await this.s3.send(
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: video.fileKey,
        UploadId: video.uploadId,
        PartNumber: chunkIndex + 1,
        Body: data,
      }),
    );

    // 청크 정보 저장
    await this.chunkRepository.save({
      videoVersionId: id,
      chunkIndex,
      etag: ETag,
    });

    return { uploaded: true };
  }

  async completeUpload(id: string, dto: CompleteUploadDto) {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['chunks'],
    });

    // Multipart upload 완료
    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: video.fileKey,
        UploadId: video.uploadId,
        MultipartUpload: {
          Parts: video.chunks
            .sort((a, b) => a.chunkIndex - b.chunkIndex)
            .map((chunk) => ({
              PartNumber: chunk.chunkIndex + 1,
              ETag: chunk.etag,
            })),
        },
      }),
    );

    // 영상 처리 작업 큐에 추가
    await this.videoQueue.add('process', { videoVersionId: id });

    return this.videoRepository.save({
      ...video,
      status: 'processing',
      changeNotes: dto.changeNotes,
    });
  }
}
```

---

## 11. 알림 서비스

```typescript
// modules/notifications/notifications.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateNotificationDto) {
    // DB 저장
    const notification = await this.notificationRepository.save({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      content: dto.content,
      link: dto.link,
      metadata: dto.metadata,
    });

    // 이메일 발송 (설정 확인 후)
    const settings = await this.getSettings(dto.userId);
    if (this.shouldSendEmail(dto.type, settings)) {
      await this.mailService.send({
        to: dto.userEmail,
        subject: dto.title,
        template: this.getEmailTemplate(dto.type),
        context: dto,
      });
    }

    return notification;
  }

  private shouldSendEmail(type: string, settings: NotificationSettings): boolean {
    const mapping: Record<string, keyof NotificationSettings> = {
      new_feedback: 'emailNewFeedback',
      urgent_feedback: 'emailUrgentFeedback',
      version_upload: 'emailVersionUpload',
    };
    return settings[mapping[type]] ?? false;
  }
}
```

---

## 체크리스트

### API 엔드포인트 작성 시 확인

- [ ] Swagger 문서화 (@ApiTags, @ApiOperation)
- [ ] DTO 유효성 검증
- [ ] 인증/인가 Guard 적용
- [ ] 에러 핸들링
- [ ] 페이지네이션 (목록 API)
- [ ] 트랜잭션 (복수 엔티티 수정 시)
- [ ] 로깅
