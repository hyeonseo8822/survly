// api/surveyAPI.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// 토큰 관리
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// API 호출 헬퍼 함수
const apiCall = async (url, options = {}) => {
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || '요청 처리 중 오류가 발생했습니다.');
  }
  
  return data;
};

// ==================== AUTH API ====================

export const authAPI = {
  // 회원가입
  register: async (userData) => {
    const result = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return result;
  },

  // 로그인
  login: async (credentials) => {
    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (result.token) {
      setToken(result.token);
    }
    
    return result;
  },

  // 로그아웃
  logout: () => {
    removeToken();
  },

  // 로그인 상태 확인
  isLoggedIn: () => {
    return !!getToken();
  }
};

// ==================== SURVEY API ====================

export const surveyAPI = {
  // 설문지 생성
  create: async (surveyData) => {
    return apiCall('/surveys', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  },

  // 내가 만든 설문지 목록 조회
  getMySurveys: async () => {
    return apiCall('/surveys/my');
  },

  // 모든 공개 설문지 목록 조회
  getPublicSurveys: async () => {
    return apiCall('/surveys');
  },

  // 특정 설문지 조회
  getById: async (id) => {
    return apiCall(`/surveys/${id}`);
  },

  // 설문지 수정
  update: async (id, surveyData) => {
    return apiCall(`/surveys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(surveyData),
    });
  },

  // 설문지 삭제
  delete: async (id) => {
    return apiCall(`/surveys/${id}`, {
      method: 'DELETE',
    });
  },

  // 설문지 통계 조회
  getStatistics: async (id) => {
    return apiCall(`/surveys/${id}/statistics`);
  },

  // 설문지 응답 목록 조회 - 백엔드 엔드포인트에 맞게 수정
  getResponses: async (id) => {
    return apiCall(`/surveys/${id}/results`);
  },
};

// ==================== RESPONSE API ====================

export const responseAPI = {
  // 응답 제출
  submit: async (responseData) => {
    return apiCall('/responses', {
      method: 'POST',
      body: JSON.stringify(responseData),
    });
  },
};

// ==================== UTILITY FUNCTIONS ====================

// React 컴포넌트의 questions 데이터를 API 형식으로 변환
export const transformQuestionsForAPI = (questions, title, description) => {
  return {
    title: title || '제목 없는 설문지',
    description: description || '',
    questions: questions.map(q => ({
      questionType: q.questionType,
      question: q.question || '',
      options: q.questionType === 'objective' ? q.options.filter(opt => opt.trim() !== '') : null,
      isOn: q.isOn || false,
    })).filter(q => q.question.trim() !== ''), // 빈 질문 제거
  };
};

// API에서 받은 데이터를 React 컴포넌트 형식으로 변환
export const transformQuestionsFromAPI = (survey) => {
  const questions = survey.questions ? survey.questions.map(q => ({
    questionType: q.type === 'multiple-choice' ? 'objective' : 'subjective',
    question: q.question,
    options: q.options ? q.options.map(opt => opt.optionText) : ['옵션 1'],
    isOn: q.isRequired === 1,
  })) : [{ questionType: "objective", options: ["옵션 1"], isOn: false, question: '' }];

  return {
    title: survey.title || '',
    description: survey.description || '',
    questions: questions
  };
};