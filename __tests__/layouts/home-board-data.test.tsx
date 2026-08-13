import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createLayoutTest,
  createMockComponentRegistryWithBasics,
  screen,
} from '@core/template-engine/__tests__/utils/layoutTestUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateRoot = path.resolve(__dirname, '..', '..');

function readJson<T = any>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(templateRoot, relativePath), 'utf-8')) as T;
}

function loadTemplateTranslations(locale: 'en' | 'ko') {
  const manifest = readJson<Record<string, any>>(`lang/${locale}.json`);

  return Object.fromEntries(
    Object.entries(manifest).map(([key, value]) => {
      if (value && typeof value === 'object' && typeof value.$partial === 'string') {
        return [key, readJson(`lang/${value.$partial}`)];
      }

      return [key, value];
    })
  );
}

function resolvePartials<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => resolvePartials(item)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, any>;
  if (typeof record.partial === 'string') {
    return resolvePartials(readJson(path.join('layouts', record.partial)));
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [key, resolvePartials(child)])
  ) as T;
}

function createRegistry() {
  const registry = createMockComponentRegistryWithBasics();

  registry.register('basic', 'Icon', ({ name, className }) => (
    <span className={className} data-icon={name} />
  ));
  registry.register('layout', 'Container', ({ children, className }) => (
    <div className={className}>{children}</div>
  ));

  return registry;
}

function createHomeLayoutTest(locale: 'en' | 'ko' = 'ko') {
  const homeLayout = resolvePartials(readJson('layouts/home.json'));
  const testUtils = createLayoutTest(homeLayout, {
    componentRegistry: createRegistry(),
    templateId: 'glitter-academy_core',
    locale,
    translations: loadTemplateTranslations(locale),
  });

  return testUtils;
}

describe('glitter-academy_core home board data bindings', () => {
  let testUtils: ReturnType<typeof createHomeLayoutTest> | null = null;

  afterEach(() => {
    testUtils?.cleanup();
    testUtils = null;
  });

  it('renders public board API data on the homepage', async () => {
    testUtils = createHomeLayoutTest();

    testUtils.mockApi('stats', {
      response: {
        data: {
          users: 11,
          boards: 6,
          requests: 1,
          comments: 0,
        },
      },
    });
    testUtils.mockApi('recent_posts', {
      response: {
        data: [
          {
            id: 6,
            board_slug: 'notice',
            board_name: '운영 안내',
            title: 'Welcome to the notice board',
            created_at: '2026-05-03 05:51',
            created_at_formatted: '7분 전',
            comment_count: 0,
            is_secret: false,
            is_new: true,
          },
          {
            id: 8,
            board_slug: 'free',
            board_name: '자유 상담',
            title: 'Free board update',
            created_at: '2026-05-03 06:10',
            created_at_formatted: '3분 전',
            comment_count: 0,
            is_secret: false,
            is_new: true,
          },
        ],
      },
    });
    testUtils.mockApi('popular_boards', {
      response: {
        data: [
          { id: 30, name: '운영 안내', slug: 'notice', posts_count: 1 },
          { id: 32, name: '상담 문의', slug: 'qna', posts_count: 0 },
          { id: 31, name: '자유 상담', slug: 'free', posts_count: 0 },
          { id: 33, name: '상담 자료', slug: 'resources', posts_count: 0 },
          { id: 34, name: '신규 사용자 안내', slug: 'introductions', posts_count: 0 },
          { id: 35, name: '예약 지원', slug: 'support', posts_count: 0 },
        ],
      },
    });
    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getAllByText('운영 안내').length).toBeGreaterThan(0);
    expect(screen.getAllByText('자유 상담').length).toBeGreaterThan(0);
    expect(screen.getAllByText('상담 문의').length).toBeGreaterThan(0);
    expect(screen.getAllByText('상담 자료').length).toBeGreaterThan(0);
    expect(screen.getByText('상담 운영 안내')).toBeInTheDocument();
    expect(screen.getByText('예약 가능 시간, 상담 절차, 운영 공지를 안내하는 공간입니다.')).toBeInTheDocument();
    expect(screen.getByText('상담 센터 문의')).toBeInTheDocument();
    expect(screen.getByText('상담 내용 확인 요청')).toBeInTheDocument();
    expect(screen.getByText('상담 운영 정책')).toBeInTheDocument();
    expect(screen.getByText('상담 전 자유롭게 고민과 상황을 공유하는 공간입니다.')).toBeInTheDocument();
    expect(screen.getByText('학습 상담, 일정 문의, 추가 지원을 요청하는 공간입니다.')).toBeInTheDocument();
    expect(screen.queryByText('boards.notice')).not.toBeInTheDocument();
    expect(screen.queryByText('boards.free')).not.toBeInTheDocument();
    expect(screen.queryByText('boards.qna')).not.toBeInTheDocument();
    expect(screen.getAllByText('Welcome to the notice board')).toHaveLength(1);
    expect(screen.getAllByText('Free board update').length).toBeGreaterThan(0);
    expect(screen.queryByText('기타게시판')).not.toBeInTheDocument();

    const bodyText = document.body.textContent ?? '';
    expect(bodyText.indexOf('Welcome to the notice board')).toBeLessThan(bodyText.indexOf('Free board update'));
  });

  it('renders starter board names through the active locale', async () => {
    testUtils = createHomeLayoutTest('en');

    testUtils.mockApi('stats', {
      response: {
        data: {
          users: 11,
          boards: 6,
          requests: 1,
          comments: 0,
        },
      },
    });
    testUtils.mockApi('recent_posts', {
      response: {
        data: [
          {
            id: 6,
            board_slug: 'notice',
            board_name: '운영 안내',
            title: 'Welcome to the notice board',
            created_at: '2026-05-03 05:51',
            created_at_formatted: '7 minutes ago',
            comment_count: 0,
            is_secret: false,
            is_new: true,
          },
        ],
      },
    });
    testUtils.mockApi('popular_boards', {
      response: {
        data: [
          { id: 30, name: '운영 안내', slug: 'notice', posts_count: 1 },
          { id: 32, name: '상담 문의', slug: 'qna', posts_count: 0 },
          { id: 31, name: '자유 상담', slug: 'free', posts_count: 0 },
          { id: 33, name: '상담 자료', slug: 'resources', posts_count: 0 },
          { id: 34, name: '신규 사용자 안내', slug: 'introductions', posts_count: 0 },
          { id: 35, name: '예약 지원', slug: 'support', posts_count: 0 },
        ],
      },
    });
    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getAllByText('Operating Notices').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Open Consultation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Consultation Inquiry').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Consultation Resources').length).toBeGreaterThan(0);
    expect(screen.getByText('Consultation Operating Notices')).toBeInTheDocument();
    expect(screen.getByText('Use this space for available times, booking steps, and service updates.')).toBeInTheDocument();
    expect(screen.getByText('Consultation Center Support')).toBeInTheDocument();
    expect(screen.getByText('Request consultation content review')).toBeInTheDocument();
    expect(screen.getByText('Consultation Operating Policy')).toBeInTheDocument();
    expect(screen.getByText('Open space to share concerns before consultation.')).toBeInTheDocument();
    expect(screen.getByText('Learning consultation, schedule questions, and support requests.')).toBeInTheDocument();
    expect(screen.queryByText('boards.notice')).not.toBeInTheDocument();
    expect(screen.queryByText('boards.free')).not.toBeInTheDocument();
    expect(screen.queryByText('boards.qna')).not.toBeInTheDocument();
    expect(screen.queryByText('운영 안내')).not.toBeInTheDocument();
    expect(screen.queryByText('자유 상담')).not.toBeInTheDocument();
    expect(screen.queryByText('상담 문의')).not.toBeInTheDocument();
  });

  it('preserves homepage empty states when board arrays are empty', async () => {
    testUtils = createHomeLayoutTest();

    testUtils.mockApi('stats', {
      response: { data: { users: 0, boards: 0, requests: 0, comments: 0 } },
    });
    testUtils.mockApi('recent_posts', { response: { data: [] } });
    testUtils.mockApi('popular_boards', { response: { data: [] } });

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('첫 상담 요청을 기다리고 있습니다')).toBeInTheDocument();
    expect(screen.getByText('예약 활동에 따라 인기 상담 분야가 정렬됩니다')).toBeInTheDocument();
    expect(screen.getByText('아직 실시간 상담 활동이 없습니다')).toBeInTheDocument();
    expect(screen.queryByText('상담 분야 설정 후 추천 항목이 표시됩니다')).not.toBeInTheDocument();
  });

  it('keeps homepage write choices limited to free and qna boards', () => {
    const startPost = readJson<any>('layouts/partials/home/_start_post.json');
    const choices = startPost.children[0].children[1].children;

    expect(choices).toHaveLength(2);
    expect(JSON.stringify(startPost)).toContain('/board/free/write');
    expect(JSON.stringify(startPost)).toContain('/board/qna/write');
    expect(JSON.stringify(startPost)).not.toContain('/board/notice/write');
    expect(JSON.stringify(startPost)).not.toContain('/board/resources/write');
    expect(JSON.stringify(startPost)).not.toContain('/board/introductions/write');
    expect(JSON.stringify(startPost)).not.toContain('/board/support/write');
    expect(JSON.stringify(startPost)).not.toContain('$t:boards.notice');
  });

  it('aligns below-hero home sections with the hero content width', () => {
    const home = readJson<any>('layouts/home.json');
    const sections = home.slots.content[0].children;
    const alignedClass = '-mx-4 sm:-mx-6 lg:-mx-8';
    const sectionClassByPartial = new Map<string, string>();

    for (const section of sections) {
      const partials = JSON.stringify(section.children ?? []);

      if (partials.includes('partials/home/')) {
        sectionClassByPartial.set(partials, section.props?.className ?? '');
      }
    }

    for (const partial of [
      '_community_notice_panel.json',
      '_live_activity.json',
      '_board_discovery.json',
      '_recent_posts.json',
      '_popular_boards.json',
      '_community_guide.json',
      '_support_entry.json',
    ]) {
      const wrapperClass = [...sectionClassByPartial.entries()].find(([partials]) => partials.includes(partial))?.[1] ?? '';

      expect(wrapperClass).toContain(alignedClass);
    }
  });

  it('keeps the homepage support entry compact and linked to existing routes', () => {
    const home = readJson<any>('layouts/home.json');
    const supportEntry = readJson<any>('layouts/partials/home/_support_entry.json');
    const homeText = JSON.stringify(home);
    const supportText = JSON.stringify(supportEntry);

    expect(homeText).toContain('partials/home/_support_entry.json');
    expect(supportText).toContain('/board/support');
    expect(supportText).toContain('/page/refund');
    expect(supportText).toContain('$t:home.support_entry.report_title');
    expect(supportText).toContain('$t:home.support_entry.policy_title');
    expect(supportText).toContain('grid grid-cols-1 gap-2');
    expect(supportText).not.toContain('Report & Booking Support');
    expect(supportText).not.toContain('Consultation Operating Policy');
  });

  it('renders refreshed homepage stats and recent requests after a free-board post is created', async () => {
    testUtils = createHomeLayoutTest();

    testUtils.mockApi('stats', {
      response: {
        data: {
          users: 11,
          boards: 3,
          requests: 2,
          comments: 0,
        },
      },
    });
    testUtils.mockApi('recent_posts', {
      response: {
        data: [
          {
            id: 77,
            board_slug: 'free',
            board_name: '자유 상담',
            title: '새 자유 상담 글',
            created_at: '2026-05-03 07:10',
            created_at_formatted: '방금 전',
            comment_count: 0,
            is_secret: false,
            is_new: true,
          },
        ],
      },
    });
    testUtils.mockApi('popular_boards', {
      response: {
        data: [
          { id: 31, name: '자유 상담', slug: 'free', posts_count: 1 },
          { id: 30, name: '운영 안내', slug: 'notice', posts_count: 1 },
          { id: 32, name: '상담 문의', slug: 'qna', posts_count: 0 },
        ],
      },
    });
    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getAllByText('자유 상담').length).toBeGreaterThan(0);
    expect(screen.getAllByText('새 자유 상담 글').length).toBeGreaterThan(0);
    expect(screen.getAllByText('방금 전').length).toBeGreaterThan(0);
    expect(screen.queryByText('첫 상담 요청을 기다리고 있습니다')).not.toBeInTheDocument();
  });
});
