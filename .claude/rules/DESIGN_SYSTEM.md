# Ticky 디자인 시스템 (Design System)

**버전:** 1.0  
**최종 수정:** 2025-01-22

---

## 1. 디자인 원칙

### 1.1 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **심플** | 불필요한 장식 최소화, 콘텐츠 중심 |
| **미니멀** | 핵심 기능에 집중, 클린한 인터페이스 |
| **직관적** | 한국 사용자 친화적, 학습 비용 최소화 |
| **일관성** | 통일된 컴포넌트, 예측 가능한 동작 |

### 1.2 참고 서비스

- [Vrew](https://vrew.ai) - 영상 편집 워크플로우
- [미리캔버스](https://miricanvas.com) - 캔버스 자유배치
- [Notion](https://notion.so) - 문서 편집 UX
- [Frame.io](https://frame.io) - 영상 피드백

---

## 2. 색상 (Colors)

### 2.1 Primary (브랜드)

```css
--primary-50:  #EFF6FF;
--primary-100: #DBEAFE;
--primary-200: #BFDBFE;
--primary-300: #93C5FD;
--primary-400: #60A5FA;
--primary-500: #3B82F6;  /* 메인 */
--primary-600: #2563EB;  /* 호버 */
--primary-700: #1D4ED8;  /* 액티브 */
--primary-800: #1E40AF;
--primary-900: #1E3A8A;
```

### 2.2 Neutral (중립)

```css
--gray-50:  #F9FAFB;
--gray-100: #F3F4F6;  /* 배경 */
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;  /* 보더 */
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;  /* 보조 텍스트 */
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;  /* 메인 텍스트 */
```

### 2.3 Semantic (의미)

```css
/* 성공 */
--success-50:  #ECFDF5;
--success-100: #D1FAE5;
--success-500: #10B981;  /* 메인 */
--success-600: #059669;
--success-700: #047857;

/* 경고 */
--warning-50:  #FFFBEB;
--warning-100: #FEF3C7;
--warning-500: #F59E0B;  /* 메인 */
--warning-600: #D97706;
--warning-700: #B45309;

/* 에러 */
--error-50:  #FEF2F2;
--error-100: #FEE2E2;
--error-500: #EF4444;  /* 메인 */
--error-600: #DC2626;
--error-700: #B91C1C;

/* 정보 */
--info-50:  #EFF6FF;
--info-100: #DBEAFE;
--info-500: #3B82F6;  /* 메인 */
--info-600: #2563EB;
--info-700: #1D4ED8;
```

### 2.4 상태 색상

```css
/* 피드백/프로젝트 상태 */
--status-pending:     #EF4444;  /* 대기중: 빨강 */
--status-in-progress: #F59E0B;  /* 진행중: 노랑 */
--status-review:      #3B82F6;  /* 검토중: 파랑 */
--status-completed:   #10B981;  /* 완료: 초록 */
```

### 2.5 TailwindCSS 설정

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // ... 나머지 색상
      },
    },
  },
};
```

---

## 3. 타이포그래피 (Typography)

### 3.1 폰트 패밀리

```css
/* 한글 */
--font-korean: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;

/* 영문/숫자 */
--font-english: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* 코드 */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 폰트 사이즈

| 이름 | 크기 | 줄 높이 | 용도 |
|------|------|---------|------|
| `text-xs` | 12px | 1.4 | 캡션, 뱃지 |
| `text-sm` | 13px | 1.5 | 보조 텍스트 |
| `text-base` | 14px | 1.5 | 본문 (기본) |
| `text-lg` | 16px | 1.5 | 강조 본문 |
| `text-xl` | 18px | 1.4 | Heading 4 |
| `text-2xl` | 20px | 1.4 | Heading 3 |
| `text-3xl` | 24px | 1.3 | Heading 2 |
| `text-4xl` | 28px | 1.3 | Heading 1 |

### 3.3 폰트 웨이트

| 이름 | 값 | 용도 |
|------|-----|------|
| `font-normal` | 400 | 본문 |
| `font-medium` | 500 | 강조 |
| `font-semibold` | 600 | 소제목 |
| `font-bold` | 700 | 제목 |

### 3.4 사용 예시

```jsx
// Heading 1
<h1 className="text-4xl font-bold text-gray-900">대시보드</h1>

// Heading 2
<h2 className="text-3xl font-bold text-gray-900">프로젝트</h2>

// Heading 3
<h3 className="text-2xl font-semibold text-gray-900">최근 활동</h3>

// 본문
<p className="text-base text-gray-600">설명 텍스트입니다.</p>

// 캡션
<span className="text-xs text-gray-500">5분 전</span>
```

---

## 4. 간격 (Spacing)

### 4.1 간격 스케일

4px 기반 시스템:

| 이름 | 값 | 용도 |
|------|-----|------|
| `space-0.5` | 2px | 아이콘-텍스트 간격 |
| `space-1` | 4px | 최소 간격 |
| `space-2` | 8px | 요소 내부 |
| `space-3` | 12px | 요소 간 좁은 간격 |
| `space-4` | 16px | 요소 간 기본 간격 |
| `space-5` | 20px | - |
| `space-6` | 24px | 섹션 내부 |
| `space-8` | 32px | 섹션 간 |
| `space-10` | 40px | 큰 섹션 간 |
| `space-12` | 48px | 페이지 여백 |
| `space-16` | 64px | 큰 여백 |

### 4.2 컴포넌트 내부 패딩

```css
/* 버튼 */
--btn-padding-sm: 8px 12px;
--btn-padding-md: 10px 16px;
--btn-padding-lg: 12px 20px;

/* 입력 필드 */
--input-padding: 8px 12px;

/* 카드 */
--card-padding: 16px;
--card-padding-lg: 24px;

/* 모달 */
--modal-padding: 24px;
```

---

## 5. 컴포넌트

### 5.1 버튼 (Button)

**크기:**

| 크기 | 높이 | 폰트 | 패딩 |
|------|------|------|------|
| sm | 32px | 13px | 8px 12px |
| md | 40px | 14px | 10px 16px |
| lg | 48px | 16px | 12px 20px |

**변형:**

```jsx
// Primary
<button className="bg-primary-500 hover:bg-primary-600 text-white">

// Secondary
<button className="bg-gray-100 hover:bg-gray-200 text-gray-900">

// Outline
<button className="border border-gray-300 hover:bg-gray-50 text-gray-700">

// Ghost
<button className="hover:bg-gray-100 text-gray-700">

// Danger
<button className="bg-error-500 hover:bg-error-600 text-white">
```

**상태:**

- Default: 기본 색상
- Hover: 어두운 색상 또는 배경 추가
- Active: 더 어두운 색상
- Disabled: `opacity-50 cursor-not-allowed`
- Loading: 스피너 + 텍스트 또는 스피너만

### 5.2 입력 필드 (Input)

```jsx
// 기본
<input className="
  w-full h-10 px-3 py-2
  border border-gray-300 rounded-md
  text-gray-900 placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
  disabled:bg-gray-100 disabled:cursor-not-allowed
" />

// 에러
<input className="
  border-error-500
  focus:ring-error-500
" />
```

### 5.3 카드 (Card)

```jsx
<div className="
  bg-white rounded-lg border border-gray-200
  p-4 shadow-sm
  hover:shadow-md transition-shadow
">
  {/* 콘텐츠 */}
</div>
```

### 5.4 뱃지 (Badge)

```jsx
// Primary
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700">

// Success
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success-100 text-success-700">

// Warning
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-warning-100 text-warning-700">

// Error
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-error-100 text-error-700">

// Gray
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
```

### 5.5 모달 (Modal)

```jsx
// 오버레이
<div className="fixed inset-0 bg-black/50 z-50">

// 모달 컨테이너
<div className="
  fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
  bg-white rounded-lg shadow-xl
  w-full max-w-md max-h-[90vh] overflow-auto
  p-6
">
  {/* 헤더 */}
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-xl font-semibold">{title}</h3>
    <button className="text-gray-400 hover:text-gray-600">✕</button>
  </div>
  
  {/* 콘텐츠 */}
  <div className="mb-6">
    {children}
  </div>
  
  {/* 푸터 */}
  <div className="flex justify-end gap-3">
    <Button variant="outline">취소</Button>
    <Button variant="primary">확인</Button>
  </div>
</div>
```

### 5.6 토스트 (Toast)

```jsx
// 성공
<div className="bg-success-50 border border-success-200 text-success-800 rounded-lg p-4">

// 에러
<div className="bg-error-50 border border-error-200 text-error-800 rounded-lg p-4">

// 경고
<div className="bg-warning-50 border border-warning-200 text-warning-800 rounded-lg p-4">

// 정보
<div className="bg-info-50 border border-info-200 text-info-800 rounded-lg p-4">
```

---

## 6. 레이아웃

### 6.1 반응형 브레이크포인트

```css
/* TailwindCSS 기본값 사용 */
sm:  640px   /* 모바일 (세로) */
md:  768px   /* 태블릿 */
lg:  1024px  /* 노트북 */
xl:  1280px  /* 데스크톱 */
2xl: 1536px  /* 큰 데스크톱 */
```

### 6.2 컨테이너

```jsx
// 최대 너비 제한
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### 6.3 그리드

```jsx
// 프로젝트 카드 그리드
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// 대시보드 레이아웃
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-12 lg:col-span-8">{/* 메인 */}</div>
  <div className="col-span-12 lg:col-span-4">{/* 사이드바 */}</div>
</div>
```

### 6.4 사이드바 레이아웃

```jsx
// 데스크톱
<div className="flex">
  <aside className="w-64 fixed left-0 top-0 h-screen">
    {/* 사이드바 */}
  </aside>
  <main className="ml-64 flex-1">
    {/* 메인 콘텐츠 */}
  </main>
</div>

// 모바일
<aside className="
  fixed inset-y-0 left-0 w-64
  transform -translate-x-full
  transition-transform
  lg:translate-x-0 lg:static
">
```

---

## 7. 아이콘

### 7.1 라이브러리

**Lucide React** 사용 (권장)

```jsx
import { Home, Settings, Bell, Plus, X, Check } from 'lucide-react';

<Home className="w-5 h-5" />
<Settings className="w-5 h-5 text-gray-500" />
```

### 7.2 크기

| 용도 | 크기 | Tailwind |
|------|------|----------|
| 인라인 (버튼 내) | 16px | `w-4 h-4` |
| 기본 | 20px | `w-5 h-5` |
| 큰 아이콘 | 24px | `w-6 h-6` |
| 히어로 | 32px+ | `w-8 h-8` |

---

## 8. 애니메이션

### 8.1 Transition

```css
/* 기본 트랜지션 */
transition-all duration-200

/* 빠른 트랜지션 */
transition-all duration-150

/* 느린 트랜지션 */
transition-all duration-300
```

### 8.2 호버 효과

```jsx
// 카드 호버
<div className="transition-shadow hover:shadow-md">

// 버튼 호버
<button className="transition-colors hover:bg-gray-100">

// 스케일 효과
<div className="transition-transform hover:scale-105">
```

### 8.3 로딩 스피너

```jsx
<div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
```

---

## 9. 다크 모드 (선택적)

```jsx
// 다크 모드 색상
<div className="bg-white dark:bg-gray-900">
<p className="text-gray-900 dark:text-gray-100">
<div className="border-gray-200 dark:border-gray-700">
```

---

## 10. 접근성 (Accessibility)

### 10.1 색상 대비

- 텍스트: 최소 4.5:1 대비율
- 큰 텍스트 (18px+): 최소 3:1 대비율
- UI 요소: 최소 3:1 대비율

### 10.2 포커스 표시

```jsx
// 모든 인터랙티브 요소에 포커스 링
<button className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
```

### 10.3 ARIA

```jsx
// 버튼
<button aria-label="닫기">
  <X />
</button>

// 모달
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">

// 알림
<div role="alert" aria-live="polite">
```

---

## 체크리스트

### 디자인 적용 시 확인

- [ ] 색상 시스템 준수
- [ ] 폰트 크기/웨이트 일관성
- [ ] 간격 스케일 준수
- [ ] 반응형 레이아웃
- [ ] 호버/포커스 상태
- [ ] 로딩/에러 상태
- [ ] 접근성 (색상 대비, ARIA)
