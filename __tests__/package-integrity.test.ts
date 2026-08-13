import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ErrorHandlingResolver } from '@core/error/ErrorHandlingResolver';

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'template.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(root, 'routes.json'), 'utf8'));

function visit(value: unknown, callback: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => visit(entry, callback));
    return;
  }
  if (!value || typeof value !== 'object') return;

  Object.entries(value).forEach(([key, entry]) => {
    callback(key, entry);
    visit(entry, callback);
  });
}

describe('glitter-academy_core package integrity', () => {
  it('has the distributable user-template metadata', () => {
    expect(manifest.identifier).toBe('glitter-academy_core');
    expect(manifest.type).toBe('user');
    expect(manifest.g7_version).toBe('>=7.0.6');
    expect(manifest.dependencies.modules['sirsoft-board']).toBe('>=1.0.3');
    expect(manifest.dependencies.modules['sirsoft-page']).toBe('>=1.0.2');
    expect(manifest.dependencies.modules['glitter-reservation']).toBe('>=0.2.4');
    expect(manifest.dependencies.plugins['sirsoft-daum_postcode']).toBe('>=1.0.1');
    expect(packageJson.version).toBe(manifest.version);
    expect(packageLock.version).toBe(manifest.version);
    expect(packageLock.packages[''].version).toBe(manifest.version);
  });

  it('contains every declared asset and error layout', () => {
    for (const asset of [...manifest.assets.css, ...manifest.assets.js]) {
      expect(fs.existsSync(path.join(root, asset)), asset).toBe(true);
    }

    for (const layout of Object.values<string>(manifest.error_config.layouts)) {
      expect(layout).toMatch(/^errors\//);
      expect(fs.existsSync(path.join(root, 'layouts', `${layout}.json`)), layout).toBe(true);
    }

    const componentBundle = fs.readFileSync(
      path.join(root, 'dist/js/components.iife.js'),
      'utf8',
    );
    expect(componentBundle).toContain(manifest.version);
  });

  it('contains the board write layout and its partial chain', () => {
    expect(fs.existsSync(path.join(root, 'layouts/board/form.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'layouts/partials/board/form/_type_renderer.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'layouts/partials/board/form/_post_form.json'))).toBe(true);
  });

  it('does not ship local environment files or source maps', () => {
    expect(fs.existsSync(path.join(root, '.env'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'dist/js/components.iife.js.map'))).toBe(false);
    expect(fs.existsSync(path.join(root, '.git'))).toBe(false);
  });

  it('uses the Gnuboard7 7.0.6 canonical error layout identifiers', () => {
    expect(manifest.error_config.layouts).toEqual({
      401: 'errors/401',
      404: 'errors/404',
      403: 'errors/403',
      500: 'errors/500',
      503: 'errors/503',
      maintenance: 'errors/maintenance',
    });
  });

  it('keeps each error layout internal identifier aligned with its manifest path', () => {
    for (const layoutName of Object.values<string>(manifest.error_config.layouts)) {
      const layout = JSON.parse(
        fs.readFileSync(path.join(root, 'layouts', `${layoutName}.json`), 'utf8'),
      );

      expect(layout.layout_name, layoutName).toBe(layoutName);
    }
  });

  it('resolves every route layout and every partial using the G7 package root contract', () => {
    const layoutRoot = path.join(root, 'layouts');

    for (const route of routes.routes) {
      if (!route.layout) continue;
      expect(fs.existsSync(path.join(layoutRoot, `${route.layout}.json`)), route.path).toBe(true);
    }

    for (const file of fs.readdirSync(layoutRoot, { recursive: true, encoding: 'utf8' })) {
      if (!file.endsWith('.json')) continue;
      const absoluteFile = path.join(layoutRoot, file);
      const layout = JSON.parse(fs.readFileSync(absoluteFile, 'utf8'));

      visit(layout, (key, value) => {
        if (key !== 'partial' || typeof value !== 'string') return;
        const partialPath = value.startsWith('partials/')
          ? path.join(layoutRoot, value)
          : path.resolve(path.dirname(absoluteFile), value);
        expect(fs.existsSync(partialPath), `${file}: ${value}`).toBe(true);
      });
    }
  });

  it('does not rely on the Academy-only auto_fetch blur exclusion', () => {
    const boardForm = JSON.parse(
      fs.readFileSync(path.join(root, 'layouts/board/form.json'), 'utf8'),
    );
    const content = boardForm.slots.content as Array<Record<string, unknown>>;
    const formContainer = content.find((item) => item.dataKey === 'form');

    expect(formContainer?.blur_until_loaded).toEqual({
      enabled: true,
      data_sources: ['form_data'],
    });
  });

  it('gates the Official 7.0.6 protected board form contract with public user abilities', () => {
    const boardForm = JSON.parse(
      fs.readFileSync(path.join(root, 'layouts/board/form.json'), 'utf8'),
    );
    const officialForm = JSON.parse(
      fs.readFileSync(
        path.resolve(root, '../sirsoft-basic/layouts/board/form.json'),
        'utf8',
      ),
    );
    const route = routes.routes.find((candidate) => candidate.path === '/board/:slug/write');
    const routeMatch = '/board/qna/write'.match(/^\/board\/([^/]+)\/write$/);

    expect(route?.layout).toBe('board/form');
    expect(routeMatch?.[1]).toBe('qna');

    const accessSource = boardForm.data_sources.find(
      (candidate) => candidate.id === 'board_access',
    );

    expect(accessSource).toMatchObject({
      type: 'api',
      endpoint: '/api/modules/sirsoft-board/boards/{{route.slug}}',
      method: 'GET',
      auto_fetch: true,
      auth_mode: 'optional',
      loading_strategy: 'progressive',
      params: { include_user_abilities: 1 },
    });
    expect(JSON.stringify(accessSource.onSuccess)).toContain(
      'response.data.data.user_abilities.can_write === true',
    );
    expect(JSON.stringify(accessSource.onSuccess)).toContain('form_data');

    for (const id of ['form_data', 'form_meta']) {
      const source = boardForm.data_sources.find((candidate) => candidate.id === id);
      const officialSource = officialForm.data_sources.find((candidate) => candidate.id === id);

      expect(source).toMatchObject({
        type: 'api',
        endpoint: officialSource.endpoint,
        method: 'GET',
        auto_fetch: false,
        auth_mode: 'optional',
      });
      expect(source.endpoint.replace('{{route.slug}}', routeMatch![1])).toBe(
        `/api/modules/sirsoft-board/boards/qna/posts/${id.replace('_', '-')}`,
      );
    }

    expect(JSON.stringify(boardForm.data_sources.find((source) => source.id === 'form_data').onSuccess))
      .toContain('form_meta');
  });

  it('renders checking, denied, and allowed write states without a route-level 403', () => {
    const boardForm = JSON.parse(
      fs.readFileSync(path.join(root, 'layouts/board/form.json'), 'utf8'),
    );
    const serialized = JSON.stringify(boardForm);
    const formData = boardForm.data_sources.find((source) => source.id === 'form_data');
    const formMeta = boardForm.data_sources.find((source) => source.id === 'form_meta');

    expect(serialized).toContain('boardAccess');
    expect(serialized).toContain("_local.boardAccess === 'allowed'");
    expect(serialized).toContain('partials/board/_access_state.json');
    expect(JSON.stringify(formData.errorHandling['403'])).not.toContain('showErrorPage');
    expect(JSON.stringify(formMeta.errorHandling['403'])).not.toContain('showErrorPage');
    expect(JSON.stringify(formData.params)).toContain('parent_id');
    expect(JSON.stringify(formData.params)).toContain('post_id');
  });

  it('declares an idempotent qna dependency and an Official admin API setup path', () => {
    const dependency = JSON.parse(
      fs.readFileSync(path.join(root, 'setup/required-boards.json'), 'utf8'),
    );
    const setupPartial = JSON.parse(
      fs.readFileSync(path.join(root, 'layouts/partials/board/_access_state.json'), 'utf8'),
    );
    const serialized = JSON.stringify(setupPartial);

    expect(dependency.boards.qna).toMatchObject({
      slug: 'qna',
      is_active: true,
      type: 'basic',
      secret_mode: 'enabled',
      show_view_count: true,
      use_report: false,
      use_file_upload: true,
    });
    expect(serialized).toContain('/api/modules/sirsoft-board/admin/boards');
    expect(serialized).toContain('sirsoft-board.boards.create');
    expect(serialized).toContain('boardAccess');
    expect(serialized).toContain('missing');
    expect(serialized).toContain('denied');
    expect(serialized).toContain('board_access');
    expect(serialized).not.toContain('PUT');
    expect(serialized).toContain('already_exists');
    expect(serialized).toContain('setupState');
  });

  it('ships one minimal, environment-independent qna definition', () => {
    const dependency = JSON.parse(
      fs.readFileSync(path.join(root, 'setup/required-boards.json'), 'utf8'),
    );
    const boards = Object.values<Record<string, unknown>>(dependency.boards);
    const qna = dependency.boards.qna;

    expect(boards).toHaveLength(1);
    expect(new Set(boards.map((board) => board.slug)).size).toBe(boards.length);
    expect(qna).toEqual({
      name: { ko: '상담 문의', en: 'Consultation Inquiry' },
      slug: 'qna',
      description: {
        ko: '상담, 수업, 결제 및 이용 관련 문의를 남겨주세요.',
        en: 'Ask about consultations, classes, payments, or using the academy.',
      },
      is_active: true,
      type: 'basic',
      secret_mode: 'enabled',
      show_view_count: true,
      use_report: false,
      use_file_upload: true,
      max_file_size: 5,
      max_file_count: 3,
      allowed_extensions: ['jpg', 'jpeg', 'png', 'pdf', 'zip', 'txt'],
    });
    expect(JSON.stringify(qna)).not.toMatch(/\b(id|user_id|created_at|updated_at|posts|comments|url)\b/);
    expect(qna).not.toHaveProperty('permissions');
  });

  it('uses effective permission identifiers and a race-safe create state machine', () => {
    const partial = JSON.parse(
      fs.readFileSync(path.join(root, 'layouts/partials/board/_access_state.json'), 'utf8'),
    );
    const serialized = JSON.stringify(partial);

    expect(serialized).toContain("permission.identifier === 'sirsoft-board.boards.create'");
    expect(serialized).not.toContain('is_super');
    expect(serialized).not.toContain('is_admin');
    for (const state of ['creating', 'success', 'already_exists', 'denied', 'failed']) {
      expect(serialized).toContain(state);
    }
    expect(serialized).toContain('"default"');
    expect(serialized).toContain('"dataSourceId":"board_access"');
    expect(serialized).not.toContain('error?.message');
  });

  it('resolves a completed board detail 404 to the local missing state', async () => {
    for (const file of ['layouts/board/index.json', 'layouts/board/form.json', 'layouts/board/show.json']) {
      const layout = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      const source = layout.data_sources.find((candidate: any) => candidate.id === 'board_access');
      const localState: Record<string, unknown> = { boardAccess: 'checking', setupState: 'idle' };

      ErrorHandlingResolver.resetInstance();
      const resolver = ErrorHandlingResolver.getInstance();
      resolver.setActionExecutor(async (handler: any) => {
        expect(handler.handler).toBe('conditions');
        const fallback = handler.conditions.find((condition: any) => !condition.if);
        Object.assign(localState, fallback.then.params);
      });

      const result = await resolver.resolveAndExecute(
        404,
        { status: 404, message: 'not found' },
        { errorHandling: source.errorHandling },
      );

      expect(result.handled, file).toBe(true);
      expect(localState.boardAccess, file).toBe('missing');
      expect(localState.setupState, file).toBe('idle');
    }
  });

  it('keeps the homepage independent from the qna provisioning source', () => {
    const home = JSON.parse(fs.readFileSync(path.join(root, 'layouts/home.json'), 'utf8'));
    const welcome = JSON.parse(
      fs.readFileSync(path.join(root, 'layouts/partials/home/_welcome_card.json'), 'utf8'),
    );
    const serialized = JSON.stringify({ home, welcome });

    expect(serialized).toContain('/board/qna/write');
    expect(serialized).not.toContain('board_access');
    expect(serialized).not.toContain('/admin/boards');
  });

  it('preflights board read access before list and detail requests', () => {
    for (const file of ['layouts/board/index.json', 'layouts/board/show.json']) {
      const layout = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      const access = layout.data_sources.find((source) => source.id === 'board_access');
      const protectedSources = layout.data_sources.filter((source) =>
        ['posts', 'post', 'navigation'].includes(source.id),
      );
      const serialized = JSON.stringify(layout);

      expect(access).toMatchObject({
        endpoint: '/api/modules/sirsoft-board/boards/{{route.slug}}',
        auto_fetch: true,
        params: { include_user_abilities: 1 },
      });
      expect(JSON.stringify(access.errorHandling['404'])).toContain('missing');
      expect(JSON.stringify(access.errorHandling['403'])).toContain('denied');
      expect(JSON.stringify(access.onSuccess)).toContain('user_abilities.can_read === true');
      for (const source of protectedSources) expect(source.auto_fetch).toBe(false);
      expect(serialized).toContain('partials/board/_access_state.json');
      expect(serialized).toContain("_local.boardAccess === 'allowed'");
    }
  });

  it('keeps provisioning create-only and delegates permissions to BoardService', () => {
    const setupPartial = JSON.parse(
      fs.readFileSync(path.join(root, 'layouts/partials/board/_access_state.json'), 'utf8'),
    );
    const setup = JSON.stringify(setupPartial);
    const officialRoute = fs.readFileSync(
      path.resolve(root, '../../../modules/sirsoft-board/src/routes/api.php'),
      'utf8',
    );
    const officialController = fs.readFileSync(
      path.resolve(
        root,
        '../../../modules/sirsoft-board/src/Http/Controllers/Admin/BoardController.php',
      ),
      'utf8',
    );
    const officialService = fs.readFileSync(
      path.resolve(root, '../../../modules/sirsoft-board/src/Services/BoardService.php'),
      'utf8',
    );

    expect(setup).toContain('"method":"POST"');
    expect(setup).not.toContain('"method":"PUT"');
    expect(setup).not.toContain('DELETE');
    expect(setup).toContain("_local.boardAccess === 'missing'");
    expect(officialRoute).toContain("->middleware('permission:admin,sirsoft-board.boards.create')");
    expect(officialController).toContain('$this->boardService->createBoard($request->validated())');
    expect(officialService).toContain('$this->permissionService->ensureBoardPermissions($board, $permissions)');
    expect(officialService).toContain('$this->clearBoardCaches($board->slug, $board->id)');
  });

  it('models a fresh setup without overwriting an existing customized qna board', () => {
    const canonical = JSON.parse(
      fs.readFileSync(path.join(root, 'setup/required-boards.json'), 'utf8'),
    ).boards.qna;
    const create = (boards: Array<Record<string, unknown>>) => {
      if (boards.some((board) => board.slug === canonical.slug)) return boards;
      return [...boards, structuredClone(canonical)];
    };
    const customized = { ...canonical, name: { ko: '운영자 지정 문의', en: 'Custom Help' }, per_page: 50 };

    const freshResult = create([]);
    expect(freshResult).toHaveLength(1);
    expect(freshResult[0]).toMatchObject({ slug: 'qna', is_active: true });

    const existingResult = create([customized]);
    expect(existingResult).toHaveLength(1);
    expect(existingResult[0]).toEqual(customized);
  });
});
