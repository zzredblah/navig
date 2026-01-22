import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NAVIG - 인증',
  description: '영상 제작 외주 협업 플랫폼',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600">NAVIG</h1>
          <p className="mt-2 text-sm text-gray-600">
            영상 제작 외주 협업 플랫폼
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
