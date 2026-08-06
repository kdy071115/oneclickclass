import { describe, expect, it } from 'vitest';
import {
  buildSourceCurriculum,
  combineClassSchedule,
  formatMediaDuration,
  formatClassSchedule,
  getYouTubeVideoId,
  isSupportedClassSourceFile,
  isPastClassSchedule,
  isValidYouTubeUrl,
  localDateInputValue,
  scheduleDateValue,
  scheduleTimeValue,
} from './classCreation';

describe('source curriculum builder', () => {
  it('영상 URL 소스를 공개 가능한 첫 차시로 변환한다', () => {
    expect(
      buildSourceCurriculum({
        kind: 'video-url',
        classTitle: '업무 자동화 입문',
        classSummary: '반복 업무를 자동화하는 방법을 배워요.',
        videoUrl: 'https://vimeo.com/123456789',
        videoTitle: '첫 자동화 만들기',
        videoDurationSeconds: 901,
        materials: [],
      }),
    ).toEqual({
      sectionTitle: '업무 자동화 입문',
      lessons: [
        expect.objectContaining({
          title: '첫 자동화 만들기',
          contentType: 'video',
          contentUrl: 'https://vimeo.com/123456789',
          durationMinutes: 16,
          published: true,
        }),
      ],
    });
  });

  it('업로드 자료마다 파일 확장자를 제거한 차시를 만든다', () => {
    const curriculum = buildSourceCurriculum({
      kind: 'documents',
      classTitle: '포트폴리오 클래스',
      classSummary: '자료를 따라 결과물을 완성해요.',
      materials: [
        { name: '01-준비하기.pdf', url: 'https://cdn.example.com/prepare.pdf' },
        { name: '02-완성하기.PPTX', url: 'https://cdn.example.com/finish.pptx' },
      ],
    });

    expect(curriculum.lessons).toHaveLength(2);
    expect(
      curriculum.lessons.map(({ title, contentType, published }) => ({
        title,
        contentType,
        published,
      })),
    ).toEqual([
      { title: '01-준비하기', contentType: 'document', published: true },
      { title: '02-완성하기', contentType: 'document', published: true },
    ]);
  });

  it('영상과 일반 웹 링크를 각각 알맞은 차시로 만든다', () => {
    const curriculum = buildSourceCurriculum({
      kind: 'links',
      classTitle: '여러 자료로 만든 클래스',
      classSummary: '영상과 글을 함께 참고합니다.',
      links: [
        {
          url: 'https://vimeo.com/123456789',
          title: '소개 영상',
          provider: 'VIMEO',
        },
        {
          url: 'https://blog.example.com/guide',
          title: '실습 가이드',
          provider: 'EXTERNAL',
        },
      ],
      materials: [],
    });

    expect(curriculum.lessons).toEqual([
      expect.objectContaining({ title: '소개 영상', contentType: 'video' }),
      expect.objectContaining({ title: '실습 가이드', contentType: 'document' }),
    ]);
  });

  it('사용자가 정한 자료 순서대로 링크와 파일 차시를 섞어 만든다', () => {
    const curriculum = buildSourceCurriculum({
      kind: 'mixed',
      classTitle: '자료 순서 클래스',
      classSummary: '정한 순서대로 학습합니다.',
      links: [
        {
          id: 'link-intro',
          url: 'https://vimeo.com/123456789',
          title: '소개 영상',
          provider: 'VIMEO',
        },
        {
          id: 'link-practice',
          url: 'https://blog.example.com/practice',
          title: '실습 안내',
          provider: 'EXTERNAL',
        },
      ],
      materials: [
        {
          id: 'file-guide',
          name: '준비 자료.pdf',
          url: 'https://cdn.example.com/guide.pdf',
          contentType: 'document',
        },
      ],
      sourceOrder: ['link-intro', 'file-guide', 'link-practice'],
    });

    expect(curriculum.lessons.map((lesson) => lesson.title)).toEqual([
      '소개 영상',
      '준비 자료',
      '실습 안내',
    ]);
  });

  it('강사 프로필 링크는 AI 분석에 사용하되 차시로 만들지 않는다', () => {
    const curriculum = buildSourceCurriculum({
      kind: 'links',
      classTitle: '프로필과 자료로 만든 클래스',
      classSummary: '강사 정보와 수업 자료를 함께 분석합니다.',
      links: [
        {
          url: 'https://blog.example.com/guide',
          title: '수업 가이드',
          provider: 'EXTERNAL',
        },
        {
          url: 'https://www.linkedin.com/in/teacher',
          title: '강사 프로필',
          provider: 'SOCIAL',
        },
      ],
      materials: [],
    });

    expect(curriculum.lessons).toHaveLength(1);
    expect(curriculum.lessons[0]).toMatchObject({
      title: '수업 가이드',
      contentUrl: 'https://blog.example.com/guide',
    });
  });

  it('연결된 소스가 없으면 차시를 만들지 않는다', () => {
    expect(
      buildSourceCurriculum({
        kind: 'none',
        classTitle: '직접 작성 클래스',
        classSummary: '직접 작성한 소개입니다.',
        materials: [],
      }).lessons,
    ).toEqual([]);
  });
});

describe('class source file helpers', () => {
  it('안내한 영상과 문서 확장자만 허용한다', () => {
    expect(isSupportedClassSourceFile(new File(['video'], 'lesson.mp4'), 'video')).toBe(true);
    expect(isSupportedClassSourceFile(new File(['video'], 'lesson.avi'), 'video')).toBe(false);
    expect(isSupportedClassSourceFile(new File(['doc'], 'guide.PDF'), 'document')).toBe(true);
    expect(isSupportedClassSourceFile(new File(['doc'], 'guide.zip'), 'document')).toBe(false);
  });

  it('미디어 길이를 읽기 쉬운 시간으로 표시한다', () => {
    expect(formatMediaDuration(65)).toBe('1:05');
    expect(formatMediaDuration(3_725)).toBe('1:02:05');
    expect(formatMediaDuration(0)).toBe('');
  });
});

describe('isValidYouTubeUrl', () => {
  it('YouTube 영상 주소만 허용한다', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE')).toBe(true);
    expect(isValidYouTubeUrl('https://youtu.be/M7lc1UVf-VE')).toBe(true);
    expect(isValidYouTubeUrl('https://example.com/watch?v=M7lc1UVf-VE')).toBe(false);
    expect(isValidYouTubeUrl('youtube.com/watch?v=M7lc1UVf-VE')).toBe(false);
  });

  it('지원하는 YouTube 주소에서 영상 ID를 추출한다', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=M7lc1UVf-VE')).toBe('M7lc1UVf-VE');
    expect(getYouTubeVideoId('https://youtu.be/M7lc1UVf-VE')).toBe('M7lc1UVf-VE');
    expect(getYouTubeVideoId('https://youtube.com/shorts/M7lc1UVf-VE')).toBe('M7lc1UVf-VE');
    expect(getYouTubeVideoId('https://example.com/watch?v=M7lc1UVf-VE')).toBe('');
  });
});

describe('class schedule helpers', () => {
  it('저장된 날짜와 ISO 일정에서 날짜 입력값을 추출한다', () => {
    expect(scheduleDateValue('2026-08-01')).toBe('2026-08-01');
    expect(scheduleDateValue('2026-08-01T14:30')).toBe('2026-08-01');
    expect(scheduleDateValue('2026-02-30')).toBe('');
    expect(scheduleDateValue('8월 1일')).toBe('');
  });

  it('시간이 포함된 ISO 일정에서 시간 입력값을 추출한다', () => {
    expect(scheduleTimeValue('2026-08-01T04:05')).toBe('04:05');
    expect(scheduleTimeValue('2026-08-01T23:59:30+09:00')).toBe('23:59');
    expect(scheduleTimeValue('2026-08-01')).toBe('');
    expect(scheduleTimeValue('2026-08-01T24:00')).toBe('');
  });

  it('날짜와 시간이 모두 있으면 ISO 일정으로 결합한다', () => {
    expect(combineClassSchedule('2026-08-01', '14:30')).toBe('2026-08-01T14:30');
    expect(combineClassSchedule('2026-08-01', '')).toBe('2026-08-01');
    expect(combineClassSchedule('', '14:30')).toBe('');
    expect(combineClassSchedule('2026-02-30', '14:30')).toBe('');
  });

  it('유효한 일정을 한국어 표시값으로 변환한다', () => {
    expect(formatClassSchedule('2026-08-01')).toBe('2026년 8월 1일');
    expect(formatClassSchedule('2026-08-01T14:30')).toBe('2026년 8월 1일 오후 2:30');
    expect(formatClassSchedule('2026-08-01T00:30:00Z')).toBe('2026년 8월 1일 오전 9:30');
  });

  it('빈 일정과 해석할 수 없는 표시값을 안전하게 유지한다', () => {
    expect(formatClassSchedule('')).toBe('일정 미정');
    expect(formatClassSchedule('   ')).toBe('일정 미정');
    expect(formatClassSchedule('8월 중 오픈')).toBe('8월 중 오픈');
    expect(formatClassSchedule('2026-02-30')).toBe('2026-02-30');
  });

  it('로컬 날짜 입력값과 지난 일정 여부를 계산한다', () => {
    const now = new Date(2026, 7, 3, 12, 0, 0);

    expect(localDateInputValue(now)).toBe('2026-08-03');
    expect(isPastClassSchedule('2026-08-03T11:59', now)).toBe(true);
    expect(isPastClassSchedule('2026-08-03T12:01', now)).toBe(false);
    expect(isPastClassSchedule('2026-08-03', now)).toBe(false);
  });
});
