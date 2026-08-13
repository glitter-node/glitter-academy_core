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

function loadTemplateTranslations(locale: 'en' | 'ko' = 'ko') {
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

function resolvePartials<T = any>(value: T, currentDir = 'layouts'): T {
  if (Array.isArray(value)) {
    return value.map((item) => resolvePartials(item, currentDir)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, any>;
  if (typeof record.partial === 'string') {
    const partialPath = record.partial.startsWith('partials/')
      ? path.posix.join('layouts', record.partial)
      : path.posix.normalize(path.posix.join(currentDir, record.partial));
    return resolvePartials(readJson(partialPath), path.posix.dirname(partialPath));
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [key, resolvePartials(child, currentDir)])
  ) as T;
}

function createRegistry() {
  const registry = createMockComponentRegistryWithBasics();
  const Passthrough = ({ children, text }: { children?: React.ReactNode; text?: string }) => (
    <div>{children ?? text}</div>
  );

  registry.register('layout', 'Container', ({ children, className }) => (
    <div className={className}>{children}</div>
  ));
  registry.register('layout', 'Flex', ({ children, className }) => <div className={className}>{children}</div>);
  registry.register('basic', 'Icon', ({ name }: { name?: string }) => <span data-icon={name} />);
  registry.register('basic', 'PasswordInput', ({ name }: { name?: string }) => (
    <input aria-label={name} name={name} type="password" />
  ));
  registry.register('composite', 'Toast', Passthrough);
  registry.register('composite', 'Modal', Passthrough);
  registry.register('composite', 'PageTransitionIndicator', Passthrough);

  return registry;
}

function createTemplateLayoutTest(layoutPath: string, options: Record<string, any> = {}) {
  const layout = resolvePartials(readJson(layoutPath));

  return createLayoutTest(layout, {
    componentRegistry: createRegistry(),
    templateId: 'glitter-academy_core',
    locale: options.locale ?? 'ko',
    translations: loadTemplateTranslations(options.locale ?? 'ko'),
    ...options,
  });
}

function findForms(value: any, forms: any[] = []): any[] {
  if (Array.isArray(value)) {
    value.forEach((item) => findForms(item, forms));
    return forms;
  }

  if (!value || typeof value !== 'object') {
    return forms;
  }

  if (value.name === 'Form') {
    forms.push(value);
  }

  Object.values(value).forEach((child) => findForms(child, forms));
  return forms;
}

function findApiTargets(value: any, targets: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => findApiTargets(item, targets));
    return targets;
  }

  if (!value || typeof value !== 'object') {
    return targets;
  }

  if (value.handler === 'apiCall' && typeof value.target === 'string') {
    targets.push(value.target);
  }

  Object.values(value).forEach((child) => findApiTargets(child, targets));
  return targets;
}

describe('Academy Core Template pages', () => {
  let testUtils: ReturnType<typeof createTemplateLayoutTest> | null = null;

  afterEach(() => {
    testUtils?.cleanup();
    testUtils = null;
  });

  it.each([
    ['layouts/home.json', '상담 예약 플랫폼'],
    ['layouts/academy/about.json', 'Academy Core 소개'],
    ['layouts/academy/consultation.json', '상담'],
    ['layouts/academy/programs.json', '프로그램'],
    ['layouts/academy/timetable.json', '시간표'],
    ['layouts/mypage/reservations.json', '내 예약'],
  ])('renders %s', async (layoutPath, expectedText) => {
    testUtils = createTemplateLayoutTest(layoutPath);
    testUtils.mockApi('reservation_services', { response: { data: [] } });

    await testUtils.render();
    testUtils.assertNoValidationErrors();

    expect(screen.getAllByText(expectedText).length).toBeGreaterThan(0);
  });

  it.each([
    'layouts/auth/login.json',
    'layouts/auth/register.json',
    'layouts/auth/forgot_password.json',
    'layouts/auth/reset_password.json',
    'layouts/mypage/change-password.json',
  ])('uses a single form state and form payload in %s', (layoutPath) => {
    const layout = resolvePartials(readJson(layoutPath));
    const forms = findForms(layout).filter((form) => form.actions);
    const submitForms = forms.filter((form) =>
      JSON.stringify(form.actions).includes('"type":"submit"')
    );

    expect(submitForms.length).toBeGreaterThan(0);
    submitForms.forEach((form) => {
      expect(form.dataKey).toBe('form');
      expect(JSON.stringify(form.actions)).toContain('"body":"{{form}}"');
    });
  });

  it('keeps auth and mypage endpoints bound to checked backend routes', () => {
    const layouts = [
      resolvePartials(readJson('layouts/auth/forgot_password.json')),
      resolvePartials(readJson('layouts/auth/reset_password.json')),
      resolvePartials(readJson('layouts/mypage/change-password.json')),
    ];
    const targets = layouts.flatMap((layout) => findApiTargets(layout));

    expect(targets).toContain('/api/auth/forgot-password');
    expect(targets).toContain('/api/auth/reset-password');
    expect(targets).toContain('/api/me/password');
  });

  it('defines the consultation fallback against the optional reservation module', () => {
    const layout = readJson<any>('layouts/academy/consultation.json');

    expect(layout.data_sources[0].endpoint).toBe('/modules/glitter-reservation/reservation/services');
    expect(JSON.stringify(layout)).toContain('$t:academy.reservation.module.unavailable_title');
  });

  it('uses localized reservation service labels in academy layouts', () => {
    const layouts = [
      readJson('layouts/academy/consultation.json'),
      readJson('layouts/academy/programs.json'),
    ];
    const serialized = JSON.stringify(layouts);

    expect(serialized).toContain('localized_name');
    expect(serialized).toContain('localized_description');
    expect(serialized).not.toContain('"{{service?.name ??');
    expect(serialized).not.toContain('label: service.name');
  });

  it('renders Korean reservation service labels from localized API fields', async () => {
    testUtils = createTemplateLayoutTest('layouts/academy/programs.json');
    testUtils.mockApi('reservation_services', {
      response: {
        data: [
          {
            id: 1,
            name: 'Entrance Consultation',
            localized_name: '입학 상담',
            description: 'Initial consultation for admissions, placement, and academy onboarding.',
            localized_description: '입학, 반 배정, 학원 등록 절차를 안내하는 첫 상담입니다.',
          },
        ],
      },
    });

    await testUtils.render();

    expect(screen.getByText('입학 상담')).toBeInTheDocument();
    expect(screen.getByText('입학, 반 배정, 학원 등록 절차를 안내하는 첫 상담입니다.')).toBeInTheDocument();
    expect(screen.queryByText('Entrance Consultation')).not.toBeInTheDocument();
  });

  it('defines reservation platform routes', () => {
    const routes = readJson<any>('routes.json').routes;
    const routeMap = new Map(routes.map((route: any) => [route.path, route]));

    expect(routeMap.get('/consultation')?.layout).toBe('academy/consultation');
    expect(routeMap.get('/mypage/reservations')?.layout).toBe('mypage/reservations');
    expect(routeMap.get('/mypage/reservations/:id')?.layout).toBe('mypage/reservation-detail');
    expect(routeMap.get('/mypage/reservations')?.auth_required).toBe(true);
  });

  it('binds reservation forms to the checked Glitter Reservation endpoints', () => {
    const layouts = [
      readJson('layouts/academy/consultation.json'),
      readJson('layouts/mypage/reservations.json'),
      readJson('layouts/mypage/reservation-detail.json'),
    ];
    const targets = layouts.flatMap((layout) => findApiTargets(layout));

    expect(targets).toContain('/modules/glitter-reservation/reservation/email-verifications');
    expect(targets).toContain('/modules/glitter-reservation/reservation/bookings');
    expect(targets).toContain('/modules/glitter-reservation/reservation/verification-status');
    expect(JSON.stringify(layouts)).toContain('/modules/glitter-reservation/reservation/slots');
    expect(JSON.stringify(layouts)).toContain('/modules/glitter-reservation/reservation/bookings/lookup');
    expect(JSON.stringify(layouts)).toContain('/modules/glitter-reservation/reservation/bookings/{{route?.id}}/cancel');
  });

  it('keeps reservation POST forms on the single form payload', () => {
    const layouts = [
      readJson('layouts/academy/consultation.json'),
      readJson('layouts/mypage/reservation-detail.json'),
    ];
    const postForms = layouts
      .flatMap((layout) => findForms(layout))
      .filter((form) => JSON.stringify(form.actions ?? []).includes('"method":"POST"'));

    expect(postForms.length).toBeGreaterThan(0);
    postForms.forEach((form) => {
      expect(form.dataKey).toBe('form');
      expect(JSON.stringify(form.actions)).toContain('"body":"{{form}}"');
    });
  });
});
