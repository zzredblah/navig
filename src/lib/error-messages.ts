/**
 * 에러 메시지 매핑
 * 영어 에러 메시지를 한국어로 변환하고, 사용자 친화적인 메시지 제공
 */

// 일반적인 에러 메시지 매핑
const errorMessages: Record<string, string> = {
  // 인증 관련
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
  'User already registered': '이미 가입된 이메일입니다.',
  'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
  'Invalid email': '올바른 이메일 형식이 아닙니다.',
  'Auth session missing': '로그인이 필요합니다.',
  'Refresh token not found': '세션이 만료되었습니다. 다시 로그인해주세요.',

  // 권한 관련
  'Unauthorized': '권한이 없습니다.',
  'Forbidden': '접근이 거부되었습니다.',
  'Not found': '요청한 리소스를 찾을 수 없습니다.',

  // 데이터베이스 관련
  'duplicate key value violates unique constraint': '이미 존재하는 데이터입니다.',
  'violates foreign key constraint': '참조하는 데이터가 존재하지 않습니다.',
  'null value in column': '필수 항목을 입력해주세요.',

  // 파일 관련
  'File too large': '파일 크기가 너무 큽니다.',
  'Invalid file type': '지원하지 않는 파일 형식입니다.',
  'Upload failed': '파일 업로드에 실패했습니다.',

  // 네트워크 관련
  'Network error': '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
  'Request timeout': '요청 시간이 초과되었습니다. 다시 시도해주세요.',
  'Failed to fetch': '서버에 연결할 수 없습니다.',

  // 일반
  'Server error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'Unknown error': '알 수 없는 오류가 발생했습니다.',
};

// HTTP 상태 코드별 메시지
const httpStatusMessages: Record<number, string> = {
  400: '잘못된 요청입니다.',
  401: '로그인이 필요합니다.',
  403: '접근 권한이 없습니다.',
  404: '요청한 페이지를 찾을 수 없습니다.',
  409: '충돌이 발생했습니다. 데이터를 확인해주세요.',
  413: '파일 크기가 너무 큽니다.',
  422: '입력값을 확인해주세요.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  500: '서버 오류가 발생했습니다.',
  502: '서버에 연결할 수 없습니다.',
  503: '서비스를 일시적으로 사용할 수 없습니다.',
  504: '서버 응답 시간이 초과되었습니다.',
};

/**
 * 에러 메시지를 한국어로 변환
 */
export function getErrorMessage(error: unknown): string {
  // string인 경우
  if (typeof error === 'string') {
    return errorMessages[error] || error;
  }

  // Error 객체인 경우
  if (error instanceof Error) {
    const message = error.message;

    // 정확히 일치하는 메시지 찾기
    if (errorMessages[message]) {
      return errorMessages[message];
    }

    // 부분 일치하는 메시지 찾기
    for (const [key, value] of Object.entries(errorMessages)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return message;
  }

  // API 응답 에러 객체인 경우
  if (error && typeof error === 'object') {
    const err = error as { message?: string; error?: string; status?: number };

    // HTTP 상태 코드가 있는 경우
    if (err.status && httpStatusMessages[err.status]) {
      return httpStatusMessages[err.status];
    }

    // message 또는 error 필드 확인
    const message = err.message || err.error;
    if (message) {
      return errorMessages[message] || message;
    }
  }

  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * HTTP 상태 코드에 해당하는 메시지 반환
 */
export function getHttpErrorMessage(status: number): string {
  return httpStatusMessages[status] || '오류가 발생했습니다.';
}

/**
 * 토스트에 적합한 짧은 에러 메시지 반환
 */
export function getToastErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);
  // 토스트에는 50자 이하로 표시
  if (message.length > 50) {
    return message.slice(0, 47) + '...';
  }
  return message;
}
