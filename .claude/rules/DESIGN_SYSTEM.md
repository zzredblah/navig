# Navig 디자인 시스템 (Design System)

**버전:** 2.0
**최종 수정:** 2025-01-22

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

> Navig의 브랜드 색상은 **보라색(Violet)**입니다. 크리에이티브하고 현대적인 느낌을 줍니다.

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
        <span className="text-xl font-bold text-gray-900">Navig</span>
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
        <span className="text-xl font-bold text-gray-900">Navig</span>
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

### 8.2 반응형 패턴

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

---

## 9. 다크 모드 (선택적)

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

## 10. 체크리스트

새 UI 개발 시 확인:

- [ ] Primary 색상(보라색) 사용
- [ ] 그라데이션 적용 (히어로, CTA 섹션)
- [ ] backdrop-blur 헤더
- [ ] 호버 효과 (그림자, 스케일)
- [ ] 반응형 레이아웃
- [ ] Lucide React 아이콘
- [ ] 적절한 간격 (py-20, gap-6 등)
- [ ] 트랜지션 애니메이션

---

## 11. 파일 참조

| 파일 | 용도 |
|------|------|
| `src/app/globals.css` | CSS 변수 정의 |
| `tailwind.config.ts` | Tailwind 색상 확장 |
| `src/app/page.tsx` | 랜딩 페이지 예시 |
| `src/components/layout/` | 레이아웃 컴포넌트 |
| `src/components/ui/` | shadcn/ui 컴포넌트 |
