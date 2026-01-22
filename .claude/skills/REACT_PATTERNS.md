# Navig React 패턴 (React Patterns)

**버전:** 1.0  
**최종 수정:** 2025-01-22

---

## 1. 프로젝트 구조

### 1.1 디렉토리 구조

```
apps/web/src/
├── components/           # 컴포넌트
│   ├── common/          # 공통 컴포넌트 (Button, Input, Modal 등)
│   ├── layout/          # 레이아웃 컴포넌트 (Header, Sidebar 등)
│   ├── projects/        # 프로젝트 관련 컴포넌트
│   ├── documents/       # 문서 관련 컴포넌트
│   ├── videos/          # 영상 관련 컴포넌트
│   ├── feedbacks/       # 피드백 관련 컴포넌트
│   └── dashboard/       # 대시보드 컴포넌트
├── pages/               # 페이지 컴포넌트
│   ├── auth/
│   ├── projects/
│   ├── documents/
│   └── dashboard/
├── hooks/               # 커스텀 훅
│   ├── useAuth.ts
│   ├── useProjects.ts
│   └── useDebounce.ts
├── stores/              # Zustand 스토어
│   ├── authStore.ts
│   └── uiStore.ts
├── api/                 # API 호출 함수
│   ├── client.ts        # axios 인스턴스
│   ├── auth.ts
│   ├── projects.ts
│   └── documents.ts
├── utils/               # 유틸리티 함수
│   ├── cn.ts            # classnames 헬퍼
│   ├── format.ts        # 날짜/숫자 포맷
│   └── validation.ts    # 유효성 검증
├── types/               # 타입 정의
│   ├── api.ts
│   ├── project.ts
│   └── user.ts
├── constants/           # 상수
│   └── index.ts
└── styles/              # 글로벌 스타일
    └── globals.css
```

### 1.2 컴포넌트 파일 구조

```
components/projects/
├── ProjectCard/
│   ├── index.ts              # export
│   ├── ProjectCard.tsx       # 컴포넌트
│   ├── ProjectCard.test.tsx  # 테스트
│   └── ProjectCard.stories.tsx # Storybook
├── ProjectList/
│   └── ...
└── index.ts                  # barrel export
```

---

## 2. 컴포넌트 패턴

### 2.1 기본 컴포넌트 구조

```tsx
// components/projects/ProjectCard/ProjectCard.tsx

import { memo } from 'react';
import { cn } from '@/utils/cn';
import type { Project } from '@/types/project';

// Props 타입 정의
interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  className?: string;
}

// 컴포넌트
export const ProjectCard = memo(function ProjectCard({
  project,
  onClick,
  className,
}: ProjectCardProps) {
  const handleClick = () => {
    onClick?.(project);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4',
        'hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      <h3 className="text-lg font-semibold text-gray-900">
        {project.title}
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        {project.description}
      </p>
    </div>
  );
});
```

### 2.2 Compound Component 패턴

```tsx
// components/common/Card/Card.tsx

import { createContext, useContext, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardContextValue {
  // 공유 상태/함수
}

const CardContext = createContext<CardContextValue | null>(null);

function useCardContext() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('Card components must be used within Card');
  }
  return context;
}

// Root
interface CardProps {
  children: ReactNode;
  className?: string;
}

function CardRoot({ children, className }: CardProps) {
  return (
    <CardContext.Provider value={{}}>
      <div className={cn('bg-white rounded-lg border', className)}>
        {children}
      </div>
    </CardContext.Provider>
  );
}

// Header
function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('px-4 py-3 border-b', className)}>
      {children}
    </div>
  );
}

// Body
function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  );
}

// Footer
function CardFooter({ children, className }: CardProps) {
  return (
    <div className={cn('px-4 py-3 border-t bg-gray-50', className)}>
      {children}
    </div>
  );
}

// Export
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

// 사용 예시
<Card>
  <Card.Header>제목</Card.Header>
  <Card.Body>내용</Card.Body>
  <Card.Footer>푸터</Card.Footer>
</Card>
```

### 2.3 Render Props 패턴

```tsx
// components/common/DataLoader/DataLoader.tsx

interface DataLoaderProps<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  loadingComponent?: ReactNode;
  errorComponent?: (error: Error) => ReactNode;
  children: (data: T) => ReactNode;
}

export function DataLoader<T>({
  data,
  isLoading,
  error,
  loadingComponent = <Skeleton />,
  errorComponent = (e) => <ErrorMessage error={e} />,
  children,
}: DataLoaderProps<T>) {
  if (isLoading) return <>{loadingComponent}</>;
  if (error) return <>{errorComponent(error)}</>;
  if (!data) return null;
  return <>{children(data)}</>;
}

// 사용 예시
<DataLoader data={project} isLoading={isLoading} error={error}>
  {(project) => <ProjectDetail project={project} />}
</DataLoader>
```

---

## 3. 상태 관리

### 3.1 Zustand 스토어

```tsx
// stores/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setUser: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // 초기 상태
      user: null,
      token: null,
      isAuthenticated: false,

      // 액션
      setUser: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// 선택자
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
```

### 3.2 React Query (서버 상태)

```tsx
// hooks/useProjects.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import type { Project, CreateProjectDto } from '@/types/project';

// 쿼리 키
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: string) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// 프로젝트 목록 조회
export function useProjects(filters?: Record<string, string>) {
  return useQuery({
    queryKey: projectKeys.list(JSON.stringify(filters)),
    queryFn: () => projectsApi.getAll(filters),
  });
}

// 프로젝트 상세 조회
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
  });
}

// 프로젝트 생성
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDto) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// 프로젝트 수정
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
```

---

## 4. 폼 처리

### 4.1 React Hook Form + Zod

```tsx
// components/auth/LoginForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/common';

// 스키마 정의
const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="이메일"
        type="email"
        {...register('email')}
        error={errors.email?.message}
      />
      <Input
        label="비밀번호"
        type="password"
        {...register('password')}
        error={errors.password?.message}
      />
      <Button type="submit" isLoading={isSubmitting} className="w-full">
        로그인
      </Button>
    </form>
  );
}
```

### 4.2 동적 폼 필드

```tsx
// components/documents/DynamicForm.tsx

import { useFieldArray, useForm } from 'react-hook-form';

interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
}

interface DynamicFormProps {
  fields: Field[];
  onSubmit: (data: Record<string, any>) => void;
}

export function DynamicForm({ fields, onSubmit }: DynamicFormProps) {
  const { register, handleSubmit, control } = useForm();

  const renderField = (field: Field) => {
    switch (field.type) {
      case 'text':
        return <Input {...register(field.key)} />;
      case 'textarea':
        return <Textarea {...register(field.key)} />;
      case 'select':
        return (
          <Select {...register(field.key)}>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        );
      // ... 다른 타입들
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <div key={field.key} className="mb-4">
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-error-500">*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}
      <Button type="submit">저장</Button>
    </form>
  );
}
```

---

## 5. 라우팅

### 5.1 React Router 구조

```tsx
// App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';

// Lazy loading
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/projects/ProjectDetailPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/projects/:id/videos" element={<VideosPage />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 5.2 Protected Route

```tsx
// components/auth/ProtectedRoute.tsx

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
```

---

## 6. API 통신

### 6.1 Axios 인스턴스

```tsx
// api/client.ts

import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 6.2 API 함수

```tsx
// api/projects.ts

import { apiClient } from './client';
import type { Project, CreateProjectDto } from '@/types/project';

export const projectsApi = {
  getAll: async (filters?: Record<string, string>) => {
    const { data } = await apiClient.get<{ data: Project[] }>('/projects', {
      params: filters,
    });
    return data.data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<{ data: Project }>(`/projects/${id}`);
    return data.data;
  },

  create: async (dto: CreateProjectDto) => {
    const { data } = await apiClient.post<{ data: Project }>('/projects', dto);
    return data.data;
  },

  update: async (id: string, dto: Partial<Project>) => {
    const { data } = await apiClient.patch<{ data: Project }>(
      `/projects/${id}`,
      dto
    );
    return data.data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/projects/${id}`);
  },
};
```

---

## 7. 유틸리티

### 7.1 classnames 헬퍼

```tsx
// utils/cn.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 사용 예시
<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-class',
  className
)}>
```

### 7.2 날짜 포맷

```tsx
// utils/format.ts

import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatRelativeTime(date: Date | string) {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ko,
  });
}

export function formatDate(date: Date | string, pattern = 'yyyy.MM.dd') {
  return format(new Date(date), pattern, { locale: ko });
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), 'yyyy.MM.dd HH:mm', { locale: ko });
}
```

---

## 8. 에러 처리

### 8.1 에러 바운더리

```tsx
// components/common/ErrorBoundary.tsx

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Sentry 등 에러 리포팅
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8">
            <h2 className="text-xl font-semibold text-gray-900">
              문제가 발생했습니다
            </h2>
            <p className="text-gray-600 mt-2">
              {this.state.error?.message}
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4"
            >
              다시 시도
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### 8.2 Toast 알림

```tsx
// hooks/useToast.ts

import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// 편의 함수
export const toast = {
  success: (message: string) =>
    useToastStore.getState().addToast({ type: 'success', message }),
  error: (message: string) =>
    useToastStore.getState().addToast({ type: 'error', message }),
  warning: (message: string) =>
    useToastStore.getState().addToast({ type: 'warning', message }),
  info: (message: string) =>
    useToastStore.getState().addToast({ type: 'info', message }),
};
```

---

## 9. 성능 최적화

### 9.1 메모이제이션

```tsx
// useMemo - 계산 비용이 큰 값
const sortedProjects = useMemo(() => {
  return projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}, [projects]);

// useCallback - 자식에게 전달하는 함수
const handleClick = useCallback((id: string) => {
  navigate(`/projects/${id}`);
}, [navigate]);

// memo - 리렌더링 방지
export const ProjectCard = memo(function ProjectCard({ project }) {
  // ...
});
```

### 9.2 가상화

```tsx
// 긴 목록은 react-window 사용
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  width="100%"
  itemCount={items.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <ItemCard item={items[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## 체크리스트

### 컴포넌트 작성 시 확인

- [ ] Props 타입 정의
- [ ] 기본값 설정
- [ ] 에러 상태 처리
- [ ] 로딩 상태 처리
- [ ] 접근성 (aria-*, role)
- [ ] 반응형 지원
- [ ] memo 필요성 검토
