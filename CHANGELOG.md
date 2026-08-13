# Changelog

## [1.0.0-beta.6] - 2026-08-13

### Fixed

- Align error layout internal identifiers with the canonical `errors/{code}` manifest paths so lifecycle synchronization registers resolvable layouts.
- Preflight board abilities through the public board detail contract before loading protected list, detail, or form data, preventing premature protected-API 403 responses.
- Distinguish checking, missing, denied, and allowed states across board routes and provide an idempotent first-run setup through the Official board creation API.
- Preserve an existing `qna` board without update or overwrite, and verify concurrent creation by refetching the public board detail before treating it as success.
- Minimize the canonical `qna` payload against `StoreBoardRequest`, preserving site policy defaults and the Official secret-post permission model.
- Gate setup with the effective `sirsoft-board.boards.create` permission and handle creating, success, denied, failed, and concurrent-create verification states locally.
- Resolve React, Testing Library, and dnd-kit from this package so a clean local install can execute the complete Vitest suite.

## [1.0.0-beta.5] - 2026-08-13

### Fixed

- Scope the board form loading blur to `form_data`, preserving correct behavior on the unmodified Gnuboard7 7.0.6 loader when lazy data sources are present.
- Synchronize npm package metadata with the template release version and exclude local repository metadata from the distributable package.

## [1.0.0-beta.4] - 2026-08-13

### Fixed

- Normalize error layout identifiers to the canonical `errors/{code}` package paths so fresh GitHub and ZIP installs validate before activation.

이 프로젝트의 모든 주요 변경사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

## [Unreleased]

## [1.0.0-beta.3] - 2026-08-13

### Added

- 활성 템플릿을 정식 bundled source 패키지로 승격했습니다.
- 독립 설치, 업데이트, ZIP 및 GitHub 배포 절차를 문서화했습니다.

### Changed

- 지원 코어 버전을 Gnuboard7 7.0.6 이상으로 명확히 했습니다.
- 실제 레이아웃이 사용하는 `glitter-reservation` 모듈 의존성을 선언했습니다.
- 존재하지 않는 preview 파일 metadata를 제거하고 공식 저장소 URL을 패키지 루트 기준으로 정규화했습니다.

## [1.0.0-beta.2] - 2026-05-08

### Changed

- Academy Core 상담 예약 플랫폼 템플릿 초기 정리 버전입니다.
- 상담 예약 흐름, 상담 분야, 상담 요청, 운영 안내 중심의 사용자 템플릿 방향으로 정리했습니다.
