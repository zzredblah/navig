import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Users,
  CheckCircle,
  ArrowRight,
  Upload,
  Clock,
  Shield,
  Play,
  Sparkles,
  Menu,
} from 'lucide-react';

const navItems = [
  { label: '홈', href: '#home' },
  { label: '기능', href: '#features' },
  { label: 'FAQ', href: '#faq' },
  { label: '커뮤니티', href: '#community' },
  { label: '데이터 보호', href: '#privacy' },
  { label: '가격 정책', href: '#pricing' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo-light.png"
                alt="NAVIG"
                width={100}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>

            {/* Desktop NAVIGation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">로그인</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
                  무료로 시작
                </Button>
              </Link>
              {/* Mobile Menu Button */}
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 lg:pt-40 lg:pb-32 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-purple-50" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              영상 제작 협업의 새로운 기준
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              영상 피드백,
              <br />
              <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                이제 NAVIG으로 쉽게
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              의뢰인과 작업자가 함께 영상을 만들어가는 협업 플랫폼.
              <br />
              타임라인 피드백부터 대용량 파일 공유까지, 모든 과정을 한곳에서.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto px-8 bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/25">
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 gap-2">
                <Play className="h-5 w-5" />
                데모 영상 보기
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div>
                <div className="text-3xl font-bold text-gray-900">2GB</div>
                <div className="text-sm text-gray-500">최대 파일 크기</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">무제한</div>
                <div className="text-sm text-gray-500">피드백</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">실시간</div>
                <div className="text-sm text-gray-500">협업</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              핵심 기능
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              영상 제작 외주의 <span className="text-primary-600">모든 불편함</span>을 해결합니다
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              더 이상 이메일, 카톡, 드라이브를 오가며 작업하지 마세요.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="타임라인 피드백"
              description="영상의 특정 시간에 정확한 피드백을 남기세요. 더 이상 '그 부분 있잖아요'가 필요 없습니다."
              color="primary"
            />
            <FeatureCard
              icon={<Upload className="h-6 w-6" />}
              title="대용량 파일 공유"
              description="최대 2GB 영상 파일을 안전하게 업로드하고 공유하세요. 링크 만료 걱정 없이."
              color="purple"
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="팀 협업"
              description="의뢰인, 작업자, 검수자까지. 프로젝트에 필요한 모든 사람을 초대하세요."
              color="blue"
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="버전 관리"
              description="모든 수정 버전을 자동으로 저장합니다. 이전 버전 찾느라 헤매지 마세요."
              color="green"
            />
            <FeatureCard
              icon={<CheckCircle className="h-6 w-6" />}
              title="진행 상황 추적"
              description="기획, 제작, 검수, 완료. 프로젝트 상태를 한눈에 파악하세요."
              color="orange"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="안전한 보안"
              description="영상 콘텐츠는 소중합니다. 철저한 보안으로 안전하게 보호합니다."
              color="red"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              사용 방법
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              3단계로 시작하세요
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <StepCard
              number="1"
              title="프로젝트 생성"
              description="새 프로젝트를 만들고 팀원을 초대하세요. 역할별로 권한을 설정할 수 있습니다."
            />
            <StepCard
              number="2"
              title="영상 업로드"
              description="작업 영상을 업로드하고 타임라인에 피드백을 받으세요. 실시간으로 확인 가능합니다."
            />
            <StepCard
              number="3"
              title="협업 & 완료"
              description="피드백을 반영하고, 버전을 관리하며, 최종 결과물을 전달하세요."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              가격 정책
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              무료로 시작, 필요할 때 업그레이드
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              기본 기능은 무료! 더 많은 기능이 필요하면 Pro로 업그레이드하세요.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="text-lg font-semibold text-gray-900">Free</div>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">₩0</span>
                <span className="text-gray-500">/월</span>
              </div>
              <ul className="mt-8 space-y-4">
                <PricingFeature>프로젝트 3개</PricingFeature>
                <PricingFeature>파일당 500MB</PricingFeature>
                <PricingFeature>팀원 5명</PricingFeature>
                <PricingFeature>기본 피드백 기능</PricingFeature>
              </ul>
              <Link href="/signup" className="block mt-8">
                <Button variant="outline" className="w-full">무료로 시작</Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="rounded-2xl border-2 border-primary-500 bg-white p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
                추천
              </div>
              <div className="text-lg font-semibold text-gray-900">Pro</div>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">₩29,000</span>
                <span className="text-gray-500">/월</span>
              </div>
              <ul className="mt-8 space-y-4">
                <PricingFeature>무제한 프로젝트</PricingFeature>
                <PricingFeature>파일당 2GB</PricingFeature>
                <PricingFeature>무제한 팀원</PricingFeature>
                <PricingFeature>고급 피드백 기능</PricingFeature>
                <PricingFeature>버전 관리</PricingFeature>
                <PricingFeature>우선 지원</PricingFeature>
              </ul>
              <Link href="/signup" className="block mt-8">
                <Button className="w-full bg-primary-600 hover:bg-primary-700">Pro 시작하기</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-primary-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            지금 바로 시작하세요
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            무료로 가입하고 첫 프로젝트를 만들어보세요.
            <br />
            신용카드 없이 시작할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="px-8 shadow-lg">
                무료로 시작하기
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center mb-4">
                <Image
                  src="/images/logo-dark.png"
                  alt="NAVIG"
                  width={100}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              <p className="text-gray-400 text-sm">
                영상 제작 협업의 새로운 기준
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">기능</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">가격</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">업데이트</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">지원</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">가이드</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">문의하기</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">법적 고지</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#privacy" className="hover:text-white transition-colors">개인정보 처리방침</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">이용약관</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} NAVIG. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'primary' | 'purple' | 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorStyles = {
    primary: 'bg-primary-100 text-primary-600',
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="group p-6 rounded-2xl bg-white border border-gray-100 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-100/50 transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl ${colorStyles[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/25">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-gray-600">
      <CheckCircle className="h-5 w-5 text-primary-500 flex-shrink-0" />
      {children}
    </li>
  );
}
