import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
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

  return createLayoutTest(homeLayout, {
    componentRegistry: createRegistry(),
    templateId: 'glitter-academy_core',
    locale,
    translations: loadTemplateTranslations(locale),
  });
}

function mockHomeApis(testUtils: ReturnType<typeof createHomeLayoutTest>, recentPosts: any[]) {
  testUtils.mockApi('stats', {
    response: {
      data: {
        users: 4,
        boards: 3,
        requests: recentPosts.length,
        comments: recentPosts.reduce((sum, post) => sum + (post.comment_count ?? 0), 0),
      },
    },
  });
  testUtils.mockApi('recent_posts', { response: { data: recentPosts } });
  testUtils.mockApi('popular_boards', {
    response: {
      data: [
        { id: 31, name: '자유 상담', slug: 'free', posts_count: 2 },
        { id: 32, name: '상담 문의', slug: 'qna', posts_count: 1 },
      ],
    },
  });
}

describe('glitter-academy_core home live activity strip', () => {
  let testUtils: ReturnType<typeof createHomeLayoutTest> | null = null;

  afterEach(() => {
    testUtils?.cleanup();
    testUtils = null;
  });

  it('renders post and comment activity from recent board data', async () => {
    testUtils = createHomeLayoutTest();

    mockHomeApis(testUtils, [
      {
        id: 12,
        board_slug: 'free',
        board_name: '자유 상담',
        title: '첫 인사 글',
        author_name: '민수',
        created_at_formatted: '방금 전',
        comment_count: 0,
      },
      {
        id: 13,
        board_slug: 'qna',
        board_name: '상담 문의',
        title: '설치 상담 문의',
        author: { name: '지현' },
        created_at_formatted: '3분 전',
        comment_count: 2,
      },
    ]);

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('실시간 예약 흐름')).toBeInTheDocument();
    expect(screen.getByText('현재 예약 가능 여부 업데이트 중')).toBeInTheDocument();
    expect(screen.getByText('민수')).toBeInTheDocument();
    expect(screen.getByText('지현')).toBeInTheDocument();
    expect(screen.getAllByText('상담 요청').length).toBeGreaterThan(0);
    expect(screen.getAllByText('상담 응답').length).toBeGreaterThan(0);
    expect(screen.getAllByText('자유 상담').length).toBeGreaterThan(0);
    expect(screen.getAllByText('상담 문의').length).toBeGreaterThan(0);
    expect(screen.getAllByText('방금 전').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3분 전').length).toBeGreaterThan(0);
  });

  it('renders the live activity fallback when recent activity is empty', async () => {
    testUtils = createHomeLayoutTest();

    mockHomeApis(testUtils, []);

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('아직 실시간 상담 활동이 없습니다')).toBeInTheDocument();
    expect(screen.getByText('상담 요청이나 답변이 등록되면 이곳에 예약 흐름이 표시됩니다.')).toBeInTheDocument();
  });

  it('resolves live activity translation keys in English', async () => {
    testUtils = createHomeLayoutTest('en');

    mockHomeApis(testUtils, [
      {
        id: 21,
        board_slug: 'free',
        board_name: 'Open Consultation',
        title: 'Community update',
        author_name: 'Alex',
        created_at_formatted: '1 minute ago',
        comment_count: 1,
      },
    ]);

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('Live Booking Flow')).toBeInTheDocument();
    expect(screen.getByText('Availability updating now')).toBeInTheDocument();
    expect(screen.getByText('consultation response')).toBeInTheDocument();
    expect(screen.queryByText('home.live_activity.title')).not.toBeInTheDocument();
    expect(screen.queryByText('home.live_activity.new_comment')).not.toBeInTheDocument();
  });
});
