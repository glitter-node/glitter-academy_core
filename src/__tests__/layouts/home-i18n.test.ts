import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TranslationEngine, type TranslationContext } from '@/core/template-engine/TranslationEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateRoot = path.resolve(__dirname, '..', '..', '..');

function readText(relativePath: string): string {
  return readFileSync(path.join(templateRoot, relativePath), 'utf-8');
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readText(relativePath)) as T;
}

function loadDictionary(locale: 'ko' | 'en') {
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

describe('home layout i18n enforcement', () => {
  const koContext: TranslationContext = {
    templateId: 'glitter-academy_core',
    locale: 'ko',
  };

  const enContext: TranslationContext = {
    templateId: 'glitter-academy_core',
    locale: 'en',
  };

  beforeEach(() => {
    TranslationEngine.resetInstance();
    const engine = TranslationEngine.getInstance();
    (engine as any).translations.set('glitter-academy_core:ko', loadDictionary('ko'));
    (engine as any).translations.set('glitter-academy_core:en', loadDictionary('en'));
  });

  it('uses translation keys instead of hardcoded homepage text in touched partials', () => {
    const welcomeCard = readText('layouts/partials/home/_welcome_card.json');
    const communityNoticePanel = readText('layouts/partials/home/_community_notice_panel.json');
    const noticePosts = readText('layouts/partials/home/_notice_posts.json');
    const startPost = readText('layouts/partials/home/_start_post.json');
    const communityHub = readText('layouts/partials/home/_community_hub.json');
    const liveActivity = readText('layouts/partials/home/_live_activity.json');
    const boardDiscovery = readText('layouts/partials/home/_board_discovery.json');
    const communityGuide = readText('layouts/partials/home/_community_guide.json');
    const recentPosts = readText('layouts/partials/home/_recent_posts.json');
    const popularBoards = readText('layouts/partials/home/_popular_boards.json');
    const homeLayout = readText('layouts/home.json');

    expect(welcomeCard).toContain('$t:home.hero_title');
    expect(welcomeCard).toContain('$t:home.smart_cta.guest_message');
    expect(welcomeCard).toContain('$t:home.smart_cta.new_member_message');
    expect(welcomeCard).toContain('$t:home.smart_cta.active_member_message');
    expect(welcomeCard).toContain('$t:home.smart_cta.secondary_button');
    expect(welcomeCard).toContain('$t:home.hero_visual.schedule_title');
    expect(welcomeCard).toContain('$t:home.hero_visual.chat_text');
    expect(welcomeCard).not.toContain('Glitter Academy Consultation Booking');
    expect(welcomeCard).not.toContain('"text": "Ask questions after logging in."');
    expect(welcomeCard).not.toContain('"text": "로그인 후 상담 문의을 남길 수 있습니다."');
    expect(welcomeCard).not.toContain('{{_global.settings?.general?.site_name}}$t:home.hero_title_suffix');

    expect(homeLayout).toContain('partials/home/_community_notice_panel.json');
    expect(homeLayout).not.toContain('partials/home/_notice_posts.json');
    expect(homeLayout).not.toContain('partials/home/_start_post.json');
    expect(homeLayout).not.toContain('partials/home/_community_hub.json');
    expect(homeLayout).toContain('partials/home/_live_activity.json');
    expect(homeLayout).toContain('partials/home/_board_discovery.json');
    expect(homeLayout).not.toContain('partials/home/_academy_core_overview.json');
    expect(homeLayout).not.toContain('partials/home/_stat_card_users.json');
    expect(homeLayout).not.toContain('partials/home/_board_summary.json');
    expect(homeLayout).not.toContain('"id": "home_boards"');

    expect(communityNoticePanel).toContain('$t:home.community_notice_panel.title');
    expect(communityNoticePanel).toContain('$t:home.community_notice_panel.description');
    expect(communityNoticePanel).toContain('$t:home.community_notice_panel.view_notices');
    expect(communityNoticePanel).toContain('$t:home.community_notice_panel.empty_title');
    expect(communityNoticePanel).toContain('$t:home.community_notice_panel.guidance_1');
    expect(communityNoticePanel).toContain('$t:home.community_notice_panel.guidance_2');
    expect(communityNoticePanel).toContain('$t:home.community_notice_panel.guidance_3');
    expect(communityNoticePanel).toContain('$t:boards.notice');
    expect(communityNoticePanel).toContain('$t:board.new_badge');
    expect(communityNoticePanel).toContain('/board/notice');
    expect(communityNoticePanel).not.toContain('"text": "Consultation Operating Noticess"');
    expect(communityNoticePanel).not.toContain('"text": "상담 운영 안내"');

    expect(noticePosts).toContain('$t:home.notice_posts');
    expect(noticePosts).toContain('$t:boards.notice');
    expect(noticePosts).toContain('$t:board.new_badge');
    expect(noticePosts).not.toContain('"text": "N"');

    expect(startPost).toContain('$t:home.start_post_title');
    expect(startPost).toContain('$t:home.start_post_description');
    expect(startPost).toContain('$t:boards.free');
    expect(startPost).toContain('$t:boards.qna');
    expect(startPost).toContain('$t:home.start_post_free_description');
    expect(startPost).toContain('$t:home.start_post_qna_description');
    expect(startPost).not.toContain('$t:boards.notice');
    expect(startPost).not.toContain('/board/notice/write');

    expect(recentPosts).toContain('$t:board.new_badge');
    expect(recentPosts).toContain('$t:home.comment_count_badge|count={{post?.comment_count ?? 0}}');
    expect(recentPosts).not.toContain('"text": "N"');
    expect(recentPosts).not.toContain('"text": "[{{post.comment_count}}]"');
    expect(recentPosts).toContain('$t:boards.notice');
    expect(recentPosts).toContain('$t:boards.free');
    expect(recentPosts).toContain('$t:boards.qna');
    expect(recentPosts).toContain('$t:boards.resources');
    expect(recentPosts).toContain('$t:boards.introductions');
    expect(recentPosts).toContain('$t:boards.support');
    expect(popularBoards).toContain('$t:boards.notice');
    expect(popularBoards).toContain('$t:boards.free');
    expect(popularBoards).toContain('$t:boards.qna');
    expect(popularBoards).toContain('$t:boards.resources');
    expect(popularBoards).toContain('$t:boards.introductions');
    expect(popularBoards).toContain('$t:boards.support');

    expect(communityHub).toContain('$t:home.community_hub.title');
    expect(communityHub).toContain('$t:home.community_hub.recent_activity');
    expect(communityHub).toContain('$t:home.community_hub.board_shortcuts');
    expect(communityHub).toContain('$t:home.community_hub.qna_title');
    expect(communityHub).toContain('$t:home.community_hub.first_run_title');
    expect(communityHub).toContain('$t:boards.free');
    expect(communityHub).not.toContain('"text": "Consultation Hub"');
    expect(communityHub).not.toContain('"text": "상담 허브"');

    expect(liveActivity).toContain('$t:home.live_activity.title');
    expect(liveActivity).toContain('$t:home.live_activity.new_post');
    expect(liveActivity).toContain('$t:home.live_activity.new_comment');
    expect(liveActivity).toContain('$t:home.live_activity.empty_title');
    expect(liveActivity).not.toContain('"text": "Live Activity"');
    expect(liveActivity).not.toContain('"text": "실시간 활동"');

    expect(boardDiscovery).toContain('$t:home.board_discovery.title');
    expect(boardDiscovery).toContain('$t:home.board_discovery.purpose_notice');
    expect(boardDiscovery).toContain('$t:home.board_discovery.purpose_free');
    expect(boardDiscovery).toContain('$t:home.board_discovery.purpose_qna');
    expect(boardDiscovery).toContain('$t:home.board_discovery.purpose_resources');
    expect(boardDiscovery).toContain('$t:home.board_discovery.purpose_introductions');
    expect(boardDiscovery).toContain('$t:home.board_discovery.purpose_support');
    expect(boardDiscovery).toContain('$t:home.board_discovery.empty_title');
    expect(boardDiscovery).toContain('$t:boards.notice');
    expect(boardDiscovery).toContain('$t:boards.free');
    expect(boardDiscovery).toContain('$t:boards.qna');
    expect(boardDiscovery).toContain('$t:boards.resources');
    expect(boardDiscovery).toContain('$t:boards.introductions');
    expect(boardDiscovery).toContain('$t:boards.support');
    expect(boardDiscovery).not.toContain('"text": "Consultation Area Discovery"');
    expect(boardDiscovery).not.toContain('"text": "상담 분야 탐색"');

    expect(communityGuide).toContain('$t:home.guide_bullet');
    expect(communityGuide).not.toContain('"text": "•"');
  });

  it('loads starter board names from the template language manifest', () => {
    const koManifest = readJson<Record<string, any>>('lang/ko.json');
    const enManifest = readJson<Record<string, any>>('lang/en.json');

    expect(koManifest.boards?.$partial).toBe('partial/ko/boards.json');
    expect(enManifest.boards?.$partial).toBe('partial/en/boards.json');
  });

  it('uses Button variant and size props for the primary hero CTA', () => {
    const welcomeCard = readJson<any>('layouts/partials/home/_welcome_card.json');
    const cta = welcomeCard.children[0].children[3].children[0].children[1];

    expect(cta.name).toBe('Button');
    expect(cta.props.variant).toBe('primary');
    expect(cta.props.size).toBe('md');
    expect(cta.props.className).toContain('bg-emerald-600');
    expect(cta.props.className).toContain('rounded-full');
    expect(cta.props.className).not.toContain('btn-primary-bg');
    expect(cta.props.className).not.toMatch(/\bbg-amber-/);
    expect(cta.props.className).not.toMatch(/\btext-amber-/);
    expect(cta.props.className).not.toMatch(/\bborder-amber-/);
  });

  it('keeps the hero card readable in dark mode without changing light mode classes', () => {
    const welcomeCard = readJson<any>('layouts/partials/home/_welcome_card.json');
    const heroWrapper = welcomeCard;
    const heroTitle = welcomeCard.children[0].children[1];
    const heroDescription = welcomeCard.children[0].children[2];
    const heroFooter = welcomeCard.children[0].children[4];
    const visualPanel = welcomeCard.children[1];
    const previewCard = visualPanel.children[2].children[0];
    const previewTitle = previewCard.children[0].children[0].children[1];
    const expertCard = previewCard.children[2];
    const chatBubble = visualPanel.children[2].children[1];
    const stepPill = visualPanel.children[2].children[2].children[0];
    const secondaryCtas = [
      welcomeCard.children[0].children[3].children[0].children[2],
      welcomeCard.children[0].children[3].children[1].children[2],
      welcomeCard.children[0].children[3].children[2].children[2],
    ];

    expect(heroWrapper.props.className).toContain('bg-white');
    expect(heroWrapper.props.className).toContain('dark:bg-slate-800');
    expect(heroWrapper.props.className).toContain('border-emerald-100');
    expect(heroWrapper.props.className).toContain('dark:border-slate-700');
    expect(heroTitle.props.className).toContain('text-slate-950');
    expect(heroTitle.props.className).toContain('dark:text-white');
    expect(heroDescription.props.className).toContain('text-slate-600');
    expect(heroDescription.props.className).toContain('dark:text-slate-300');
    expect(heroFooter.props.className).toContain('bg-emerald-50/70');
    expect(heroFooter.props.className).toContain('dark:bg-emerald-950/30');
    expect(heroFooter.props.className).toContain('dark:text-slate-300');

    expect(visualPanel.props.className).toContain('via-white');
    expect(visualPanel.props.className).toContain('dark:via-slate-900');
    expect(visualPanel.props.className).toContain('dark:to-emerald-950/40');
    expect(previewCard.props.className).toContain('bg-white/95');
    expect(previewCard.props.className).toContain('dark:bg-slate-800/95');
    expect(previewCard.props.className).toContain('dark:border-slate-700');
    expect(previewTitle.props.className).toContain('text-slate-950');
    expect(previewTitle.props.className).toContain('dark:text-white');
    expect(expertCard.props.className).toContain('bg-emerald-50');
    expect(expertCard.props.className).toContain('dark:bg-emerald-950/30');
    expect(chatBubble.props.className).toContain('bg-white');
    expect(chatBubble.props.className).toContain('dark:bg-slate-800');
    expect(chatBubble.props.className).toContain('dark:text-slate-300');
    expect(stepPill.props.className).toContain('bg-white/80');
    expect(stepPill.props.className).toContain('dark:bg-slate-800/90');

    for (const cta of secondaryCtas) {
      expect(cta.props.className).toContain('bg-white');
      expect(cta.props.className).toContain('dark:bg-slate-900');
      expect(cta.props.className).toContain('dark:text-emerald-300');
    }
  });

  it('uses board-specific write actions from the homepage start-post choices', () => {
    const startPost = readJson<any>('layouts/partials/home/_start_post.json');
    const choices = startPost.children[0].children[1].children;
    const [qnaChoice, freeChoice] = choices;

    expect(choices).toHaveLength(2);
    expect(qnaChoice.props.variant).toBe('primary');
    expect(qnaChoice.props.className).toContain('bg-sky-600');
    expect(freeChoice.props.variant).toBe('secondary');
    expect(freeChoice.props.className).toContain('bg-white');

    expect(qnaChoice.actions[0].handler).toBe('switch');
    expect(qnaChoice.actions[0].params.value).toBe("{{_global.currentUser?.uuid ? 'authenticated' : 'guest'}}");
    expect(qnaChoice.actions[0].cases.authenticated.params.path).toBe('/board/qna/write');
    expect(qnaChoice.actions[0].cases.guest.params.path).toBe('/login');
    expect(qnaChoice.actions[0].cases.guest.params.query.redirect).toBe('/board/qna/write');

    expect(freeChoice.actions[0].handler).toBe('switch');
    expect(freeChoice.actions[0].params.value).toBe("{{_global.currentUser?.uuid ? 'authenticated' : 'guest'}}");
    expect(freeChoice.actions[0].cases.authenticated.params.path).toBe('/board/free/write');
    expect(freeChoice.actions[0].cases.guest.params.path).toBe('/login');
    expect(freeChoice.actions[0].cases.guest.params.query.redirect).toBe('/board/free/write');
  });

  it('renders homepage text correctly in Korean mode', () => {
    const engine = TranslationEngine.getInstance();

    expect(engine.translate('home.hero_title', koContext)).toBe('학습 목표에 맞는 전문가 상담을 예약하세요');
    expect(engine.translate('home.seo_title', koContext)).toBe('글리터 아카데미 상담 예약');
    expect(engine.translate('home.notice_posts', koContext)).toBe('운영 안내');
    expect(engine.translate('home.community_notice_panel.title', koContext)).toBe('상담 운영 안내');
    expect(engine.translate('home.community_notice_panel.description', koContext)).toBe('예약 가능 시간, 상담 절차, 운영 공지를 안내하는 공간입니다.');
    expect(engine.translate('home.community_notice_panel.view_notices', koContext)).toBe('운영 안내 보기');
    expect(engine.translate('home.community_notice_panel.empty_title', koContext)).toBe('상담 운영 안내를 먼저 게시하세요');
    expect(engine.translate('home.community_notice_panel.guidance_1', koContext)).toBe('상담 가능 시간과 예약 확인 절차를 안내합니다.');
    expect(engine.translate('home.start_post_title', koContext)).toBe('상담 신청 분야를 선택하세요');
    expect(engine.translate('home.start_post_free_description', koContext)).toBe('상담 전 자유롭게 상황과 고민을 공유합니다.');
    expect(engine.translate('home.start_post_qna_description', koContext)).toBe('학습 목표, 일정, 상담 필요 사항을 남깁니다.');
    expect(engine.translate('home.recent_posts_empty_title', koContext)).toBe('첫 상담 요청을 기다리고 있습니다');
    expect(engine.translate('home.popular_boards_empty_title', koContext)).toBe('예약 활동에 따라 인기 상담 분야가 정렬됩니다');
    expect(engine.translate('home.empty_browse_boards', koContext)).toBe('상담 분야 보기');
    expect(engine.translate('home.community_hub.title', koContext)).toBe('상담 허브');
    expect(engine.translate('home.community_hub.recent_activity', koContext)).toBe('최근 상담 흐름');
    expect(engine.translate('home.community_hub.qna_title', koContext)).toBe('상담이 필요하신가요?');
    expect(engine.translate('home.community_hub.first_run_title', koContext)).toBe('상담 운영 시작 가이드');
    expect(engine.translate('home.smart_cta.guest_message', koContext)).toBe('로그인 후 상담 신청과 예약 상태 확인을 진행할 수 있습니다.');
    expect(engine.translate('home.smart_cta.new_member_button', koContext)).toBe('상담 문의 작성');
    expect(engine.translate('home.smart_cta.active_member_button', koContext)).toBe('예약 흐름 이어가기');
    expect(engine.translate('home.smart_cta.secondary_button', koContext)).toBe('가능 시간 확인');
    expect(engine.translate('home.hero_visual.schedule_title', koContext)).toBe('선택된 상담 시간');
    expect(engine.translate('home.hero_visual.chat_text', koContext)).toBe('학습 목표와 가능한 시간을 남기면 상담사가 예약 흐름을 차분히 안내합니다.');
    expect(engine.translate('home.live_activity.title', koContext)).toBe('실시간 예약 흐름');
    expect(engine.translate('home.live_activity.new_post', koContext)).toBe('상담 요청');
    expect(engine.translate('home.live_activity.new_comment', koContext)).toBe('상담 응답');
    expect(engine.translate('home.board_discovery.title', koContext)).toBe('상담 분야 탐색');
    expect(engine.translate('home.board_discovery.purpose_qna', koContext)).toBe('학습 상담, 일정 문의, 추가 지원을 요청하는 공간입니다.');
    expect(engine.translate('home.board_discovery.purpose_resources', koContext)).toBe('상담 준비 자료와 안내 문서를 모아둔 공간입니다.');
    expect(engine.translate('home.board_discovery.purpose_introductions', koContext)).toBe('신규 사용자가 이용 흐름을 확인하는 안내 공간입니다.');
    expect(engine.translate('home.board_discovery.purpose_support', koContext)).toBe('예약 이용 중 필요한 도움과 문제 상황을 남기는 공간입니다.');
    expect(engine.translate('home.board_discovery.empty_title', koContext)).toBe('아직 탐색할 상담 분야가 없습니다');
    expect(engine.translate('home.comment_count_badge', koContext, '|count=12')).toBe('답변 12개');
    expect(engine.translate('home.guide_bullet', koContext)).toBe('•');
    expect(engine.translate('board.new_badge', koContext)).toBe('NEW');
    expect(engine.translate('boards.notice', koContext)).toBe('운영 안내');
    expect(engine.translate('boards.free', koContext)).toBe('자유 상담');
    expect(engine.translate('boards.qna', koContext)).toBe('상담 문의');
    expect(engine.translate('boards.resources', koContext)).toBe('상담 자료');
    expect(engine.translate('boards.introductions', koContext)).toBe('신규 사용자 안내');
    expect(engine.translate('boards.support', koContext)).toBe('예약 지원');
    expect(engine.translate('boards.notice', koContext)).not.toBe('boards.notice');
    expect(engine.translate('boards.free', koContext)).not.toBe('boards.free');
    expect(engine.translate('boards.qna', koContext)).not.toBe('boards.qna');
  });

  it('renders homepage text correctly in English mode', () => {
    const engine = TranslationEngine.getInstance();

    expect(engine.translate('home.hero_title', enContext)).toBe('Book expert consultation for your learning goals');
    expect(engine.translate('home.seo_title', enContext)).toBe('Glitter Academy Consultation Booking');
    expect(engine.translate('home.notice_posts', enContext)).toBe('Operating notices');
    expect(engine.translate('home.community_notice_panel.title', enContext)).toBe('Consultation Operating Notices');
    expect(engine.translate('home.community_notice_panel.description', enContext)).toBe('Use this space for available times, booking steps, and service updates.');
    expect(engine.translate('home.community_notice_panel.view_notices', enContext)).toBe('View operating notices');
    expect(engine.translate('home.community_notice_panel.empty_title', enContext)).toBe('Publish consultation operating guidance first');
    expect(engine.translate('home.community_notice_panel.guidance_1', enContext)).toBe('Explain available consultation times and booking confirmation steps.');
    expect(engine.translate('home.start_post_title', enContext)).toBe('Choose a consultation request category');
    expect(engine.translate('home.start_post_free_description', enContext)).toBe('Share your situation freely before a consultation.');
    expect(engine.translate('home.start_post_qna_description', enContext)).toBe('Leave learning goals, schedule needs, and consultation details.');
    expect(engine.translate('home.recent_posts_empty_title', enContext)).toBe('Ready for the first consultation request');
    expect(engine.translate('home.popular_boards_empty_title', enContext)).toBe('Popular consultation areas will be ranked by booking activity');
    expect(engine.translate('home.empty_browse_boards', enContext)).toBe('View consultation areas');
    expect(engine.translate('home.community_hub.title', enContext)).toBe('Consultation Hub');
    expect(engine.translate('home.community_hub.recent_activity', enContext)).toBe('Recent consultation flow');
    expect(engine.translate('home.community_hub.qna_title', enContext)).toBe('Need a consultation?');
    expect(engine.translate('home.community_hub.first_run_title', enContext)).toBe('Consultation launch guide');
    expect(engine.translate('home.smart_cta.guest_message', enContext)).toBe('Sign in to request a consultation and check booking status.');
    expect(engine.translate('home.smart_cta.new_member_button', enContext)).toBe('Write consultation inquiry');
    expect(engine.translate('home.smart_cta.active_member_button', enContext)).toBe('Continue booking flow');
    expect(engine.translate('home.smart_cta.secondary_button', enContext)).toBe('Check available times');
    expect(engine.translate('home.hero_visual.schedule_title', enContext)).toBe('Selected consultation time');
    expect(engine.translate('home.hero_visual.chat_text', enContext)).toBe('Share learning goals and available times so a consultant can guide the booking flow clearly.');
    expect(engine.translate('home.live_activity.title', enContext)).toBe('Live Booking Flow');
    expect(engine.translate('home.live_activity.new_post', enContext)).toBe('consultation request');
    expect(engine.translate('home.live_activity.new_comment', enContext)).toBe('consultation response');
    expect(engine.translate('home.board_discovery.title', enContext)).toBe('Consultation Area Discovery');
    expect(engine.translate('home.board_discovery.purpose_qna', enContext)).toBe('Learning consultation, schedule questions, and support requests.');
    expect(engine.translate('home.board_discovery.purpose_resources', enContext)).toBe('Preparation materials and guidance documents.');
    expect(engine.translate('home.board_discovery.purpose_introductions', enContext)).toBe('Guidance for new users learning the booking flow.');
    expect(engine.translate('home.board_discovery.purpose_support', enContext)).toBe('Help requests and issues while using reservations.');
    expect(engine.translate('home.board_discovery.empty_title', enContext)).toBe('No consultation areas to discover yet');
    expect(engine.translate('home.comment_count_badge', enContext, '|count=12')).toBe('12 replies');
    expect(engine.translate('home.guide_bullet', enContext)).toBe('•');
    expect(engine.translate('board.new_badge', enContext)).toBe('NEW');
    expect(engine.translate('boards.notice', enContext)).toBe('Operating Notices');
    expect(engine.translate('boards.free', enContext)).toBe('Open Consultation');
    expect(engine.translate('boards.qna', enContext)).toBe('Consultation Inquiry');
    expect(engine.translate('boards.resources', enContext)).toBe('Consultation Resources');
    expect(engine.translate('boards.introductions', enContext)).toBe('New User Guidance');
    expect(engine.translate('boards.support', enContext)).toBe('Booking Support');
    expect(engine.translate('boards.notice', enContext)).not.toBe('boards.notice');
    expect(engine.translate('boards.free', enContext)).not.toBe('boards.free');
    expect(engine.translate('boards.qna', enContext)).not.toBe('boards.qna');
  });

  it('changes homepage hero text when the locale changes', () => {
    const engine = TranslationEngine.getInstance();

    const korean = engine.translate('home.hero_description', koContext);
    const english = engine.translate('home.hero_description', enContext);

    expect(korean).toBe('목표 진단부터 일정 선택, 상담 진행 상태 확인까지 한 화면에서 이어지는 교육 상담 예약 서비스입니다.');
    expect(english).toBe('Move from goal review to schedule selection and consultation status tracking in one education booking service.');
    expect(korean).not.toBe(english);
  });

  it('renders the community policy page text from template i18n only', () => {
    const engine = TranslationEngine.getInstance();
    const layout = readText('layouts/page/policy.json');

    expect(layout).toContain('$t:policy.title');
    expect(layout).toContain('$t:policy.introduction.body');
    expect(layout).toContain('$t:policy.rules.items.0');
    expect(layout).toContain('$t:policy.prohibited.items.0');
    expect(layout).toContain('$t:policy.enforcement.body');
    expect(layout).not.toContain('/api/modules/sirsoft-page');
    expect(layout).not.toContain('page?.data');

    expect(engine.translate('policy.title', koContext)).toBe('상담 운영 정책');
    expect(engine.translate('policy.introduction.title', koContext)).toBe('소개');
    expect(engine.translate('policy.rules.title', koContext)).toBe('이용 규칙');
    expect(engine.translate('policy.rules.items.0', koContext)).toBe('상담 요청과 상담 응답은 해당 상담 분야의 주제와 목적에 맞게 작성합니다.');
    expect(engine.translate('policy.prohibited.title', koContext)).toBe('금지 행위');
    expect(engine.translate('policy.enforcement.title', koContext)).toBe('신고 및 운영 조치');

    expect(engine.translate('policy.title', enContext)).toBe('Consultation Operating Policy');
    expect(engine.translate('policy.introduction.title', enContext)).toBe('Introduction');
    expect(engine.translate('policy.rules.title', enContext)).toBe('Usage Rules');
    expect(engine.translate('policy.rules.items.0', enContext)).toBe('Write requests and responses in the consultation area that best matches the topic and purpose.');
    expect(engine.translate('policy.prohibited.title', enContext)).toBe('Prohibited Behavior');
    expect(engine.translate('policy.enforcement.title', enContext)).toBe('Reporting and Enforcement');
    expect(engine.translate('policy.title', koContext)).not.toBe(engine.translate('policy.title', enContext));
  });
});
