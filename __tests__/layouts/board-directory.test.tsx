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

function createBoardDirectoryTest(locale: 'en' | 'ko' = 'ko') {
  const layout = resolvePartials(readJson('layouts/board/boards.json'));

  return createLayoutTest(layout, {
    componentRegistry: createRegistry(),
    templateId: 'glitter-academy_core',
    locale,
    translations: loadTemplateTranslations(locale),
  });
}

describe('glitter-academy_core board directory layout', () => {
  let testUtils: ReturnType<typeof createBoardDirectoryTest> | null = null;

  afterEach(() => {
    testUtils?.cleanup();
    testUtils = null;
  });

  it('renders the universal board directory with grouped board labels and Q&A CTA', async () => {
    testUtils = createBoardDirectoryTest();

    testUtils.mockApi('boardList', {
      response: {
        data: [
          { id: 1, name: '공지사항', slug: 'notice', description: '중요 안내를 확인합니다.', posts_count: 5 },
          { id: 2, name: '자유 상담', slug: 'free', description: '자유롭게 이야기를 나눕니다.', posts_count: 12 },
          {
            id: 3,
            name: '상담 문의',
            slug: 'qna',
            description: '상담 문의과 답변을 모읍니다.',
            posts_count: 3,
            user_abilities: { can_write: true },
          },
          { id: 4, name: '상담 자료', slug: 'resources', description: '공유 자료를 모읍니다.', posts_count: 7 },
          { id: 5, name: '신규 사용자 안내', slug: 'introductions', description: '새 멤버를 환영합니다.', posts_count: 2 },
          { id: 6, name: '예약 지원', slug: 'support', description: '예약 지원 요청을 다룹니다.', posts_count: 4 },
        ],
      },
    });

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('전체 상담 분야')).toBeInTheDocument();
    expect(screen.getByText('처음 상담하시나요?')).toBeInTheDocument();
    expect(screen.getByText('상담 문의하기')).toBeInTheDocument();
    expect(screen.getByText('공지')).toBeInTheDocument();
    expect(screen.getByText('상담 논의')).toBeInTheDocument();
    expect(screen.getAllByText('상담 문의').length).toBeGreaterThan(0);
    expect(screen.getByText('자료')).toBeInTheDocument();
    expect(screen.getAllByText('신규 사용자 안내').length).toBeGreaterThan(0);
    expect(screen.getAllByText('예약 지원').length).toBeGreaterThan(0);
    expect(screen.getAllByText('상담 문의').length).toBeGreaterThan(0);
    expect(screen.getByText('3개')).toBeInTheDocument();
    expect(screen.getByText('상담 신청')).toBeInTheDocument();
  });

  it('does not show board write actions when permission metadata is not allowed', async () => {
    testUtils = createBoardDirectoryTest();

    testUtils.mockApi('boardList', {
      response: {
        data: [
          { id: 11, name: '공지사항', slug: 'notice', description: '중요 안내를 확인합니다.', posts_count: 1 },
        ],
      },
    });

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('상담 분야 보기')).toBeInTheDocument();
    expect(screen.queryByText('상담 신청')).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no boards', async () => {
    testUtils = createBoardDirectoryTest();

    testUtils.mockApi('boardList', {
      response: { data: [] },
    });

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('등록된 상담 분야가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('상담 분야가 생성되면 이곳에 목적과 바로가기가 표시됩니다.')).toBeInTheDocument();
  });

  it('resolves English directory labels without raw translation keys', async () => {
    testUtils = createBoardDirectoryTest('en');

    testUtils.mockApi('boardList', {
      response: {
        data: [
          { id: 21, name: 'Q&A', slug: 'qna', description: 'Ask and answer questions.', posts_count: 9 },
        ],
      },
    });

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getByText('All Consultation Areas')).toBeInTheDocument();
    expect(screen.getByText('Starting with a question?')).toBeInTheDocument();
    expect(screen.getByText('Questions')).toBeInTheDocument();
    expect(screen.queryByText('board.directory.groups.questions')).not.toBeInTheDocument();
  });

  it('keeps the all boards route pointed at the board directory layout', () => {
    const routes = readJson<{ routes: Array<{ path: string; layout: string }> }>('routes.json');
    const directoryRoute = routes.routes.find((route) => route.path === '/boards');

    expect(directoryRoute?.layout).toBe('board/boards');
  });
});
