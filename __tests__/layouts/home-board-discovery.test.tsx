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

function mockHomeApis(testUtils: ReturnType<typeof createHomeLayoutTest>, boards: any[]) {
  testUtils.mockApi('stats', {
    response: {
      data: {
        users: 4,
        boards: boards.length,
        requests: boards.reduce((sum, board) => sum + (board.posts_count ?? 0), 0),
        comments: 0,
      },
    },
  });
  testUtils.mockApi('recent_posts', { response: { data: [] } });
  testUtils.mockApi('popular_boards', { response: { data: boards } });
}

describe('glitter-academy_core home board discovery strip', () => {
  let testUtils: ReturnType<typeof createHomeLayoutTest> | null = null;

  afterEach(() => {
    testUtils?.cleanup();
    testUtils = null;
  });

  it('renders board discovery items from existing board data', async () => {
    testUtils = createHomeLayoutTest();

    mockHomeApis(testUtils, [
      { id: 31, name: '운영 안내', slug: 'notice', posts_count: 5 },
      { id: 32, name: '자유 상담', slug: 'free', posts_count: 12 },
      { id: 33, name: '상담 문의', slug: 'qna', posts_count: 3 },
      { id: 34, name: '상담 자료', slug: 'resources', posts_count: 7 },
      { id: 35, name: '신규 사용자 안내', slug: 'introductions', posts_count: 4 },
      { id: 36, name: '예약 지원', slug: 'support', posts_count: 2 },
    ]);

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('상담 분야 탐색')).toBeInTheDocument();
    expect(screen.getByText('예약을 시작하기 전에 알맞은 상담 분야를 빠르게 선택하세요.')).toBeInTheDocument();
    expect(screen.getAllByText('운영 안내').length).toBeGreaterThan(0);
    expect(screen.getAllByText('자유 상담').length).toBeGreaterThan(0);
    expect(screen.getAllByText('상담 문의').length).toBeGreaterThan(0);
    expect(screen.getAllByText('상담 자료').length).toBeGreaterThan(0);
    expect(screen.getAllByText('신규 사용자 안내').length).toBeGreaterThan(0);
    expect(screen.getAllByText('예약 지원').length).toBeGreaterThan(0);
    expect(screen.getByText('예약 운영 안내와 꼭 확인해야 할 공지입니다.')).toBeInTheDocument();
    expect(screen.getByText('상담 전 자유롭게 고민과 상황을 공유하는 공간입니다.')).toBeInTheDocument();
    expect(screen.getByText('학습 상담, 일정 문의, 추가 지원을 요청하는 공간입니다.')).toBeInTheDocument();
    expect(screen.getByText('상담 준비 자료와 안내 문서를 모아둔 공간입니다.')).toBeInTheDocument();
    expect(screen.getAllByText('상담 요청').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
  });

  it('renders the board discovery fallback when no boards are available', async () => {
    testUtils = createHomeLayoutTest();

    mockHomeApis(testUtils, []);

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('아직 탐색할 상담 분야가 없습니다')).toBeInTheDocument();
    expect(screen.getByText('상담 분야가 생성되거나 활동 데이터가 준비되면 바로가기 목록이 이곳에 표시됩니다.')).toBeInTheDocument();
  });

  it('resolves board discovery translation keys in English', async () => {
    testUtils = createHomeLayoutTest('en');

    mockHomeApis(testUtils, [
      { id: 41, name: 'Consultation Inquiry', slug: 'qna', activity_count: 9 },
    ]);

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('Consultation Area Discovery')).toBeInTheDocument();
    expect(screen.getByText('Choose the right consultation area before starting a booking.')).toBeInTheDocument();
    expect(screen.getAllByText('Consultation Inquiry').length).toBeGreaterThan(0);
    expect(screen.getByText('Learning consultation, schedule questions, and support requests.')).toBeInTheDocument();
    expect(screen.getByText('requests')).toBeInTheDocument();
    expect(screen.queryByText('home.board_discovery.title')).not.toBeInTheDocument();
    expect(screen.queryByText('home.board_discovery.purpose_qna')).not.toBeInTheDocument();
  });

  it('resolves the support and introductions board preset labels when shown', async () => {
    testUtils = createHomeLayoutTest('en');

    mockHomeApis(testUtils, [
      { id: 41, name: 'New User Guidance', slug: 'introductions', activity_count: 9 },
      { id: 42, name: 'Booking Support', slug: 'support', activity_count: 5 },
    ]);

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getAllByText('New User Guidance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Booking Support').length).toBeGreaterThan(0);
    expect(screen.getByText('Guidance for new users learning the booking flow.')).toBeInTheDocument();
    expect(screen.getByText('Help requests and issues while using reservations.')).toBeInTheDocument();
  });
});
