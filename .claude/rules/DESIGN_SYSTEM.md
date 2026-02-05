# NAVIG 디자인 시스템 (Design System)

**버전:** 3.1
**최종 수정:** 2026-02-05

> **중요**: 모든 UI 개발 시 이 문서를 참조하세요. 일관된 디자인을 유지하기 위해 정의된 색상, 컴포넌트, 패턴을 사용해야 합니다.

---

## 1. 디자인 원칙

### 1.1 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **심플** | 불필요한 장식 최소화, 콘텐츠 중심 |
| **미니멀** | 핵심 기능에 집중, 클린한 인터페이스 |
| **직관적** | 한국 사용자 친화적, 학습 비용 최소화 |
| **일관성** | 통일된 컴포넌트, 예측 가능한 동작 |
| **현대적** | 그라데이션, 블러 효과, 부드러운 애니메이션 |

### 1.2 참고 서비스

- [Vrew](https://vrew.ai) - 보라색 테마, 현대적 디자인
- [Frame.io](https://frame.io) - 영상 피드백 UX
- [Notion](https://notion.so) - 미니멀 UI

---

## 2. 색상 (Colors)

### 2.1 Primary (브랜드) - Violet 계열

> NAVIG의 브랜드 색상은 **보라색(Violet)**입니다. 크리에이티브하고 현대적인 느낌을 줍니다.

```css
/* CSS 변수 (globals.css) */
--primary: 262 83% 58%;  /* HSL */

/* Tailwind 클래스 */
primary-50:  #F5F3FF   /* 매우 연한 배경 */
primary-100: #EDE9FE   /* 연한 배경, 뱃지 */
primary-200: #DDD6FE
primary-300: #C4B5FD
primary-400: #A78BFA
primary-500: #8B5CF6   /* 기본 */
primary-600: #7C3AED   /* 메인 (버튼, 링크) */
primary-700: #6D28D9   /* 호버 */
primary-800: #5B21B6
primary-900: #4C1D95   /* 진한 텍스트 */
```

### 2.2 그라데이션

```jsx
// 브랜드 그라데이션 (버튼, 히어로 배경)
className="bg-gradient-to-r from-primary-600 to-purple-600"

// 배경 그라데이션
className="bg-gradient-to-br from-primary-50 via-white to-purple-50"

// 텍스트 그라데이션
className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"

// 로고/아이콘 배경
className="bg-gradient-to-br from-primary-500 to-primary-700"
```

### 2.3 Neutral (중립)

```css
gray-50:  #F9FAFB   /* 페이지 배경 */
gray-100: #F3F4F6   /* 섹션 배경 */
gray-200: #E5E7EB   /* 보더 */
gray-300: #D1D5DB
gray-400: #9CA3AF   /* placeholder */
gray-500: #6B7280
gray-600: #4B5563   /* 보조 텍스트 */
gray-700: #374151
gray-800: #1F2937
gray-900: #111827   /* 메인 텍스트 */
```

### 2.4 Semantic (의미)

```jsx
// 성공 (Success)
success-50:  #ECFDF5  // 배경
success-500: #10B981  // 아이콘, 텍스트
success-600: #059669  // 호버
success-700: #047857

// 경고 (Warning)
warning-50:  #FFFBEB
warning-500: #F59E0B
warning-600: #D97706
warning-700: #B45309

// 에러 (Error)
error-50:  #FEF2F2
error-500: #EF4444
error-600: #DC2626
error-700: #B91C1C

// 정보 (Info)
info-50:  #EFF6FF
info-500: #3B82F6
info-600: #2563EB
info-700: #1D4ED8
```

### 2.5 Feature Card 색상

```jsx
const colorStyles = {
  primary: 'bg-primary-100 text-primary-600',
  purple: 'bg-purple-100 text-purple-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
};
```

---

## 3. 타이포그래피 (Typography)

### 3.1 폰트 사이즈

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `text-xs` | 12px | 캡션, 뱃지 |
| `text-sm` | 14px | 보조 텍스트, 버튼 |
| `text-base` | 16px | 본문 |
| `text-lg` | 18px | 강조 본문 |
| `text-xl` | 20px | 소제목 |
| `text-2xl` | 24px | 섹션 제목 |
| `text-3xl` | 30px | 페이지 제목 |
| `text-4xl` | 36px | 히어로 제목 |
| `text-5xl` | 48px | 랜딩 히어로 |
| `text-6xl` | 60px | 대형 히어로 |

### 3.2 사용 패턴

```jsx
// 랜딩 페이지 히어로
<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">

// 섹션 제목
<h2 className="text-3xl md:text-4xl font-bold text-gray-900">

// 카드 제목
<h3 className="text-lg font-semibold text-gray-900">

// 본문
<p className="text-gray-600 leading-relaxed">

// 보조 텍스트
<span className="text-sm text-gray-500">
```

---

## 4. 컴포넌트 패턴

### 4.1 버튼 (Button)

```jsx
// Primary (기본)
<Button className="bg-primary-600 hover:bg-primary-700">

// Primary with Shadow
<Button className="bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/25">

// Secondary
<Button variant="secondary">

// Outline
<Button variant="outline">

// Ghost
<Button variant="ghost">

// 크기
<Button size="sm">  // 작은
<Button size="lg">  // 큰
```

### 4.2 카드 (Card)

```jsx
// 기본 카드
<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">

// 호버 효과 카드
<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">

// Feature 카드 (랜딩 페이지)
<div className="group p-6 rounded-2xl bg-white border border-gray-100 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-100/50 transition-all duration-300">
  <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
    {icon}
  </div>
  <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
  <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
</div>
```

### 4.3 뱃지 (Badge)

```jsx
// 섹션 타이틀 뱃지
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
  <Sparkles className="h-4 w-4" />
  핵심 기능
</div>

// 상태 뱃지
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success-100 text-success-700">
  완료
</span>
```

### 4.4 헤더 (고정 헤더)

```jsx
<header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">
      {/* 로고 */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <Video className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">NAVIG</span>
      </Link>

      {/* 네비게이션 */}
      <nav className="hidden lg:flex items-center gap-8">
        {navItems.map((item) => (
          <Link
            href={item.href}
            className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  </div>
</header>
```

### 4.5 스텝 카드

```jsx
<div className="text-center">
  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/25">
    1
  </div>
  <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
  <p className="text-gray-600 leading-relaxed">{description}</p>
</div>
```

### 4.6 가격 카드

```jsx
// 기본 플랜
<div className="rounded-2xl border border-gray-200 bg-white p-8">
  <div className="text-lg font-semibold text-gray-900">Free</div>
  <div className="mt-4">
    <span className="text-4xl font-bold text-gray-900">₩0</span>
    <span className="text-gray-500">/월</span>
  </div>
  <ul className="mt-8 space-y-4">
    <li className="flex items-center gap-3 text-gray-600">
      <CheckCircle className="h-5 w-5 text-primary-500" />
      기능 설명
    </li>
  </ul>
</div>

// 추천 플랜
<div className="rounded-2xl border-2 border-primary-500 bg-white p-8 relative">
  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
    추천
  </div>
  {/* ... */}
</div>
```

---

## 5. 레이아웃 패턴

### 5.1 페이지 컨테이너

```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### 5.2 섹션 간격

```jsx
// 랜딩 페이지 섹션
<section className="py-20 lg:py-32">

// 일반 섹션
<section className="py-16">
```

### 5.3 히어로 섹션 배경

```jsx
<section className="relative overflow-hidden">
  {/* 배경 그라데이션 */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-purple-50" />

  {/* 블러 원형 */}
  <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary-200/30 rounded-full blur-3xl" />
  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-3xl" />

  {/* 콘텐츠 */}
  <div className="relative">
    {/* ... */}
  </div>
</section>
```

### 5.4 대시보드 레이아웃

```jsx
// MainLayout
<div className="min-h-screen bg-gray-50">
  {/* 사이드바 - 항상 fixed */}
  <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0">
    {/* 로고 */}
    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Video className="h-6 w-6 text-primary-600" />
        <span className="text-xl font-bold text-gray-900">NAVIG</span>
      </Link>
    </div>

    {/* 네비게이션 */}
    <nav className="p-4">
      {/* ... */}
    </nav>
  </aside>

  {/* 메인 콘텐츠 */}
  <div className="lg:pl-64">
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      {/* ... */}
    </header>
    <main className="p-4 sm:p-6 lg:p-8">
      {children}
    </main>
  </div>
</div>
```

### 5.5 그리드 패턴

```jsx
// 2열 그리드 (md 이상)
<div className="grid md:grid-cols-2 gap-8">

// 3열 그리드 (lg 이상)
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

// 반응형 카드 그리드
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 6. 애니메이션 & 효과

### 6.1 트랜지션

```jsx
// 기본 (모든 속성)
className="transition-all duration-200"

// 색상만
className="transition-colors"

// 그림자만
className="transition-shadow"

// 변형만 (scale, translate)
className="transition-transform"

// 긴 트랜지션
className="transition-all duration-300"
```

### 6.2 호버 효과

```jsx
// 카드 호버 (그림자 + 테두리)
className="hover:shadow-xl hover:shadow-primary-100/50 hover:border-primary-200 transition-all duration-300"

// 아이콘 스케일
className="group-hover:scale-110 transition-transform"

// 버튼 그림자
className="shadow-lg shadow-primary-500/25"

// 링크 색상
className="hover:text-primary-600 transition-colors"
```

### 6.3 로딩 스피너

```jsx
<Loader2 className="h-4 w-4 animate-spin" />
```

---

## 7. 아이콘

### 7.1 라이브러리: Lucide React

```jsx
import {
  Video,          // 로고
  MessageSquare,  // 피드백
  Users,          // 팀
  Upload,         // 업로드
  Clock,          // 시간
  CheckCircle,    // 완료
  Shield,         // 보안
  ArrowRight,     // 화살표
  Play,           // 재생
  Sparkles,       // 특별
  Menu,           // 메뉴
  X,              // 닫기
  Settings,       // 설정
  Bell,           // 알림
  LogOut,         // 로그아웃
  FolderOpen,     // 프로젝트
  LayoutDashboard,// 대시보드
} from 'lucide-react';
```

### 7.2 크기

```jsx
// 버튼 내 아이콘
className="h-4 w-4"

// 기본
className="h-5 w-5"

// 카드 아이콘
className="h-6 w-6"

// 히어로 아이콘
className="h-8 w-8"
```

---

## 8. 반응형 디자인

### 8.1 브레이크포인트

```
sm:  640px   // 모바일 (가로)
md:  768px   // 태블릿
lg:  1024px  // 노트북
xl:  1280px  // 데스크톱
2xl: 1536px  // 큰 데스크톱
```

### 8.2 기본 반응형 패턴

```jsx
// 텍스트 크기
className="text-4xl md:text-5xl lg:text-6xl"

// 패딩
className="px-4 sm:px-6 lg:px-8"

// 레이아웃
className="py-20 lg:py-32"

// 그리드
className="grid md:grid-cols-2 lg:grid-cols-3"

// 표시/숨김
className="hidden lg:flex"    // lg 이상에서만 표시
className="lg:hidden"         // lg 미만에서만 표시
```

### 8.3 페이지 헤더 (제목 + 액션 버튼) - 필수 패턴

> **중요**: 페이지 상단에 제목과 버튼이 함께 있는 레이아웃은 반드시 아래 패턴을 따를 것.
> `flex items-center justify-between`만 사용하면 모바일에서 버튼이 넘침.

```jsx
// ✅ Good: 모바일에서 세로 배치, 데스크톱에서 가로 배치
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  {/* 제목 영역 */}
  <div className="flex items-center gap-3 min-w-0">
    <Button variant="ghost" size="sm" className="shrink-0">
      <ArrowLeft className="h-4 w-4" />
    </Button>
    <div className="min-w-0">
      <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
      <div className="flex items-center gap-2 mt-1">
        <StatusBadge />
        <span className="text-sm text-gray-500">부가 정보</span>
      </div>
    </div>
  </div>

  {/* 액션 버튼 영역 */}
  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
    <Button variant="outline" size="sm">버튼1</Button>
    <Button size="sm" className="bg-primary-600">버튼2</Button>
  </div>
</div>

// ❌ Bad: 모바일에서 넘침
<div className="flex items-center justify-between">
  <h1>제목</h1>
  <div className="flex gap-2">
    <Button>버튼1</Button>
    <Button>버튼2</Button>
    <Button>버튼3</Button>
  </div>
</div>
```

**핵심 규칙:**
- 항상 `flex-col sm:flex-row` 사용
- 제목에 `min-w-0` + `truncate` 적용 (텍스트 넘침 방지)
- 버튼 영역에 `flex-wrap` 적용 (버튼 줄바꿈 허용)
- 버튼은 `size="sm"` 통일 (모바일 공간 절약)
- 뒤로가기 버튼에 `shrink-0` (축소 방지)

### 8.4 메타데이터 목록 (여러 정보 나열)

```jsx
// ✅ Good: wrap + 모바일에서 덜 중요한 정보 숨김
<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
  <span className="flex items-center gap-1">
    <Users className="h-3 w-3" /> 멤버 3
  </span>
  <span className="flex items-center gap-1">
    <FileText className="h-3 w-3" /> 문서 5
  </span>
  <span className="hidden sm:inline-flex items-center gap-1">
    생성 1월 15일
  </span>
  <span className="hidden sm:inline-flex items-center gap-1">
    수정 1월 20일
  </span>
</div>

// ❌ Bad: 한 줄에 모든 정보 → 모바일 넘침
<div className="flex items-center gap-4 text-xs">
  <span>멤버 3</span>
  <span>문서 5</span>
  <span>생성 1월 15일</span>
  <span>수정 1월 20일</span>
</div>
```

### 8.5 카드 내 가로 레이아웃

```jsx
// ✅ Good: 모바일에서 세로 스택
<CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
  <div className="flex items-center gap-3 min-w-0">
    <div className="w-10 h-10 shrink-0 rounded-lg bg-primary-100" />
    <div className="min-w-0">
      <div className="font-medium truncate">{title}</div>
      <div className="text-sm text-gray-500 truncate">{metadata}</div>
    </div>
  </div>
  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
    <Badge />
    <Button size="sm" />
  </div>
</CardContent>

// ❌ Bad: 강제 가로 배치
<CardContent className="flex items-center justify-between p-4">
```

**핵심 규칙:**
- 아이콘/이미지에 `shrink-0` (축소 방지)
- 텍스트 영역에 `min-w-0` + `truncate`
- 우측 요소에 `self-end sm:self-center` (모바일: 오른쪽 정렬)

---

## 9. 폼 입력 (Form Inputs)

### 9.1 raw HTML input 스타일링 - 필수 규칙

> **중요**: shadcn `<Input>` 컴포넌트를 사용할 수 없는 경우(date, password 등)
> raw `<input>` 요소에는 반드시 `bg-white text-gray-900`을 명시해야 함.
> CSS 변수(`text-foreground`)를 상속받아 의도치 않은 색상이 적용될 수 있음.

```jsx
// ✅ Good: 명시적 배경/텍스트 색상
<input
  type="text"
  className="mt-1 block w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
/>

// ✅ Good: 비활성화 상태
<input
  type="email"
  disabled
  className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 text-gray-500 px-3 py-2 text-sm"
/>

// ❌ Bad: bg/text 색상 미지정 → 검은색/어두운 배경 가능
<input
  type="text"
  className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
/>
```

**필수 클래스:**
- `bg-white` - 배경색 명시
- `text-gray-900` - 텍스트 색상 명시
- `placeholder:text-gray-400` - placeholder 색상
- `focus:outline-none` - 브라우저 기본 아웃라인 제거
- `focus:ring-1 focus:ring-primary-500` - 커스텀 포커스 링

### 9.2 shadcn Input/Textarea 사용 우선

```jsx
// 가능하면 항상 shadcn 컴포넌트 사용
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

<Input value={value} onChange={onChange} />
<Textarea value={value} onChange={onChange} rows={4} />
```

raw `<input>`이 필요한 경우:
- `type="date"` (shadcn에 없음)
- `type="file"` (hidden + 커스텀 버튼)
- 특수한 스타일링 필요 시

---

## 10. 빈 상태 & 피드백 (Empty States)

### 10.1 원칙

> **모든 인터랙티브 요소는 항상 피드백을 제공해야 함.**
> 버튼을 클릭했는데 아무 반응이 없으면 버그로 느껴짐.

### 10.2 드롭다운/팝오버 빈 상태

```jsx
// ✅ Good: 알림 벨 - 비어있어도 드롭다운 표시
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <Bell className="h-5 w-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-72" align="end">
    <div className="px-3 py-2 border-b border-gray-100">
      <p className="text-sm font-medium text-gray-900">알림</p>
    </div>
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <Bell className="h-8 w-8 text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">알림이 없습니다</p>
      <p className="text-xs text-gray-400 mt-0.5">새로운 알림이 오면 여기에 표시됩니다</p>
    </div>
  </DropdownMenuContent>
</DropdownMenu>

// ❌ Bad: 클릭해도 반응 없는 버튼
<Button variant="ghost" size="icon">
  <Bell className="h-5 w-5" />
</Button>
```

### 10.3 리스트 빈 상태

```jsx
// 빈 리스트 패턴
<div className="flex flex-col items-center justify-center py-16">
  <Icon className="h-12 w-12 text-gray-300 mb-4" />
  <p className="text-gray-500 mb-2">데이터가 없습니다</p>
  <p className="text-sm text-gray-400 mb-4">설명 메시지</p>
  <Button variant="outline" onClick={handleCreate}>
    <Plus className="h-4 w-4 mr-2" />
    새로 만들기
  </Button>
</div>
```

---

## 11. 접근성 (Accessibility) - 필수

### 11.1 포커스 스타일 - 모든 인터랙티브 요소 필수

> **중요**: 키보드 사용자를 위해 모든 클릭 가능한 요소는 포커스 스타일이 필수입니다.
> shadcn/ui `<Button>` 컴포넌트는 자동 적용되지만, raw `<button>`, `<div onClick>` 등은 직접 추가해야 합니다.

```jsx
// ✅ Good: 포커스 스타일이 있는 raw 버튼
<button
  onClick={handleClick}
  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded px-2 py-1"
>
  클릭
</button>

// ✅ Good: 아이콘만 있는 버튼
<button
  onClick={handleAction}
  className="p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
  aria-label="액션 설명"
>
  <Icon className="h-4 w-4" />
</button>

// ❌ Bad: 포커스 스타일 없음
<button onClick={handleClick} className="text-gray-400 hover:text-gray-600">
  클릭
</button>

// ❌ Bad: div를 버튼처럼 사용
<div onClick={handleClick} className="cursor-pointer">
  클릭
</div>
```

**필수 포커스 클래스:**
```css
focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
```

### 11.2 ARIA 레이블 - 아이콘 버튼 필수

```jsx
// ✅ Good: aria-label로 버튼 목적 설명
<button
  onClick={onDelete}
  aria-label="삭제"
  className="..."
>
  <Trash2 className="h-4 w-4" />
</button>

// ✅ Good: 토글 버튼에 aria-pressed 사용
<button
  onClick={() => setIsActive(!isActive)}
  aria-label={isActive ? '활성화됨' : '비활성화됨'}
  aria-pressed={isActive}
  className="..."
>
  <Icon />
</button>

// ✅ Good: 리액션 버튼
<button
  onClick={() => handleReaction(emoji)}
  aria-label={`${emoji} 리액션 ${count}명${reactedByMe ? ' (나도 반응함)' : ''}`}
  aria-pressed={reactedByMe}
  className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ..."
>
  <span>{emoji}</span>
  <span>{count}</span>
</button>

// ❌ Bad: 텍스트 없는 버튼에 aria-label 없음
<button onClick={onDelete}>
  <Trash2 className="h-4 w-4" />
</button>
```

### 11.3 색상 선택기 (Color Picker) 접근성

```jsx
// ✅ Good: radiogroup 역할 + aria-label
<div className="space-y-2">
  <Label id="color-picker-label">색상</Label>
  <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="color-picker-label">
    {COLORS.map((color) => (
      <button
        key={color}
        type="button"
        role="radio"
        aria-checked={selectedColor === color}
        aria-label={`색상 ${color}`}
        onClick={() => setSelectedColor(color)}
        className={cn(
          'w-6 h-6 rounded border-2 transition-transform',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          selectedColor === color ? 'border-primary-500 scale-110' : 'border-gray-200'
        )}
        style={{ backgroundColor: color }}
      />
    ))}
  </div>
</div>

// ❌ Bad: 역할과 상태 정보 없음
<div className="flex gap-2">
  {COLORS.map((color) => (
    <button
      key={color}
      onClick={() => setSelectedColor(color)}
      className="w-6 h-6 rounded"
      style={{ backgroundColor: color }}
    />
  ))}
</div>
```

### 11.4 Toast vs Alert - 에러/알림 표시

> **중요**: 브라우저 `alert()`는 절대 사용 금지. 항상 toast 사용.

```jsx
// ✅ Good: toast 사용
import { toast } from '@/hooks/use-toast';
// 또는
import { toast } from 'sonner';

// 에러 표시
toast({
  variant: 'destructive',
  title: '파일 크기 초과',
  description: '20MB를 초과할 수 없습니다.',
});

// 성공 표시
toast({
  title: '저장 완료',
  description: '변경사항이 저장되었습니다.',
});

// sonner 사용 시
toast.error('업로드 실패');
toast.success('저장 완료');

// ❌ Bad: 브라우저 alert 사용
alert('파일 크기가 너무 큽니다!');
```

**Toast 사용 이유:**
- 화면 차단 없이 피드백 제공
- 일관된 디자인
- 자동 사라짐 + 수동 닫기 지원
- 여러 알림 스택 가능

---

## 12. 다크 모드 (선택적)

```css
/* globals.css에 정의됨 */
.dark {
  --primary: 262 83% 68%;
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

---

## 12. 체크리스트

새 UI 개발 시 확인:

- [ ] Primary 색상(보라색) 사용
- [ ] 그라데이션 적용 (히어로, CTA 섹션)
- [ ] backdrop-blur 헤더
- [ ] 호버 효과 (그림자, 스케일)
- [ ] Lucide React 아이콘
- [ ] 적절한 간격 (py-20, gap-6 등)
- [ ] 트랜지션 애니메이션

### 반응형 (필수)
- [ ] 페이지 헤더: `flex-col sm:flex-row` 패턴 사용 (§8.3)
- [ ] 메타데이터 목록: `flex-wrap` + 모바일 숨김 (§8.4)
- [ ] 카드 레이아웃: `flex-col sm:flex-row` (§8.5)
- [ ] 긴 텍스트: `min-w-0` + `truncate`
- [ ] 액션 버튼: `flex-wrap` + `size="sm"`
- [ ] 덜 중요한 정보: `hidden sm:inline-flex`로 모바일 숨김

### 폼/입력 (필수)
- [ ] raw `<input>` 사용 시 `bg-white text-gray-900` 명시 (§9.1)
- [ ] `placeholder:text-gray-400` + `focus:outline-none` 포함
- [ ] 가능하면 shadcn `<Input>` 컴포넌트 사용 (§9.2)

### 인터랙션 (필수)
- [ ] 모든 클릭 가능한 요소에 피드백 존재 (§10)
- [ ] 빈 상태 UI 구현 (리스트, 드롭다운)
- [ ] 로딩/에러 상태 UI 구현

### 접근성 (필수)
- [ ] 모든 raw 버튼에 포커스 스타일: `focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1` (§11.1)
- [ ] 아이콘만 있는 버튼에 `aria-label` 필수 (§11.2)
- [ ] 토글 버튼에 `aria-pressed` 사용 (§11.2)
- [ ] 색상 선택기에 `role="radiogroup"` + `aria-checked` (§11.3)
- [ ] 에러/알림은 `alert()` 대신 `toast` 사용 (§11.4)
- [ ] shadcn `<Button>` 컴포넌트 우선 사용 (자동 포커스 스타일)

---

## 13. 파일 참조

| 파일 | 용도 |
|------|------|
| `src/app/globals.css` | CSS 변수 정의 |
| `tailwind.config.ts` | Tailwind 색상 확장 |
| `src/app/page.tsx` | 랜딩 페이지 예시 |
| `src/components/layout/` | 레이아웃 컴포넌트 |
| `src/components/ui/` | shadcn/ui 컴포넌트 |
