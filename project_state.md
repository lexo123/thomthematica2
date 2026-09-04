# thomthematica2 — Project State

_ბოლო განახლება: Phase 2.5 დასრულების შემდეგ_

## Repo
https://github.com/lexo123/thomthematica2

## პროექტის მოკლე აღწერა
React/TypeScript საგანმანათლებლო მათემატიკის აპლიკაცია ბავშვებისთვის, თავდაპირველად აშენებული ერთი ბავშვისთვის (thomthematica), ახლა გადადის multi-user/Parent→Child მოდელზე Supabase-ის (Auth + Postgres + RLS) გამოყენებით. კოდი იწერება Google AI Studio-ს (Gemini) მიერ vibe-coding მიდგომით; Claude და ChatGPT ცალ-ცალკე აკეთებენ code review-ს ყოველ commit-ზე, სანამ შემდეგი ეტაპი დაიწყება.

## დასრულებული ფაზები

### Phase 1: Authentication ✅
- Supabase Auth (email/password), AuthContext.tsx, AuthModal.tsx
- Password recovery flow (PASSWORD_RECOVERY event handling, UpdatePasswordModal.tsx)
- supabase/schema.sql — 4 table: profiles, children, game_sessions, wishes
- RLS policies ყველა ცხრილზე, WITH CHECK კლაუზებით (არა მხოლოდ USING)
- updated_at auto-update trigger (BEFORE UPDATE) — საჭირო abandoned-session დეტექციისთვის
- handle_new_user() trigger — ავტომატური profiles row auth.users insert-ზე
- lib/ensureProfile.ts — client-side self-healing fallback (ON CONFLICT DO NOTHING, legacy ანგარიშებისთვის)
- profiles-ს არ აქვს client-side DELETE policy (განზრახ — account deletion მხოლოდ Edge Function-ით)

### Phase 2.1: Child Profiles & Selector ✅
- ChildContext.tsx — activeChildId-ის ერთადერთი წყარო, localStorage persistence
- Self-healing validation — თუ activeChildId აღარ არსებობს childrenList-ში, სუფთავდება
- ChildSelector.tsx — "ვინ თამაშობს?" UI, Guest Mode-ისთვის არ ჩნდება

### Phase 2.2: Sync Service ✅
- services/supabaseSyncService.ts — schema-ს ველების ზუსტი მთხვევა (game_mode, total_questions, total_correct, perfect_blocks_count, status, correct_count, fulfilled_at)
- .upsert() idempotent, id-ზე დაფუძნებული

### Phase 2.3: Session Lifecycle ✅
hooks/useGameSession.ts-ში:
- sessionId lifecycle: იქმნება ერთხელ, თანმიმდევრულად გადაეცემა auto-save-სა და completion sync-ს
- Sequential FIFO sync queue (enqueueSync) — race condition-ის გამორიცხვა
- Page Visibility API-ზე დაფუძნებული active play duration (background დრო არ ითვლება)
- Guest ↔ Authenticated გარდამავალი მდგომარეობების წესები (mid-session logout/login არ ურევს სესიებს)
- ნაპოვნი და გასწორებული ბაგი: ცალკეული [gameMode] და [childId] ეფექტები აორმაგებდნენ flush-ს ერთდროული mode+child ცვლილებისას → გაერთიანდა ერთ ატომურ [gameMode, childId] ეფექტში, flushCompletedSession(override) პარამეტრით (არა latestRef-ზე დამოკიდებული)
- Cleanup ფუნქციაც დეტერმინისტულია (nextMode/nextChild closure-ში დაკავებული, არა latestRef-ზე დამოკიდებული)

### Phase 2.4a: activeChildId → Thomthematica (POC) ✅
- sessionChildId = (gameMode === Thomthematica && user) ? activeChildId : null
- Child Selection Gate: isGameScreenBlocked = Boolean(gameMode !== null && user && !activeChildId)
- ThomthematicaGate.test.tsx — 4 ტესტი (0 children / children but none selected / active child / guest)

### Phase 2.4b: activeChildId → ყველა Game Mode ✅
- sessionChildId = user ? activeChildId : null (განზოგადებული, 1 ხაზი)
- ოთხივე რეჟიმი (Thomthematica, ThomravlebisTabula, Gethometria, Kveshmicera) დაკავშირებულია
- tests/GameModesGate.test.tsx — gate + guest-access ტესტები ოთხივე რეჟიმზე (it.each)
- modeChanged: true, childChanged: false სცენარი (იგივე ბავშვი, mode switch) — ცალკე ტესტირებული
- E2E DOM ტესტები Kveshmicera-სა და Gethometria-ზეც (არა მხოლოდ Thomthematica)
- 63/63 ტესტი, 0 TypeScript შეცდომა, production build წარმატებული

### Phase 2.5: Migration Gate Closure — Guest Mode-ის სრული მოცილება (Variant A) ✅
- Guest Mode მთლიანად გაუქმებულია — ყველა მომხმარებელი გადის authenticated flow-ით
- App.tsx: isGameScreenBlocked გაფართოვდა — თამაშის რეჟიმი დაბლოკილია როგორც !user (Auth blocking screen, AuthModal-ის გახსნის call-to-action-ით), ასევე user && !activeChildId (არსებული Child Selection Gate)
- services/statsService.ts (Google Apps Script/Google Sheets sync) — ფიზიკურად წაშლილია
- useGameSession.ts — Guest-specific Google Sheets sync path-ები მოცილდა; დამატებით გასწორდა Guest-transition branch, ხოლო protected Session ID lifecycle/FIFO queue/auto-save/completion architecture შენარჩუნებულია.
- **Migration Gate-ის საბოლოო architecture decision**: `thomthematica2`-ს Google Apps Script public-write endpoint-ზე აღარ აქვს არანაირი დამოკიდებულება — არც source-ში, არც production build bundle-ში, არც runtime-ში (დამოუკიდებლად ვერიფიცირებული). **Endpoint განზრახ რჩება აქტიური**, რადგან მას იყენებს ცალკე, `thomthematica2`-ის scope-ის მიღმა მდგომი legacy `thomthematica` (ერთ-ბავშვიანი) აპლიკაცია. Phase 2.5-ის security objective — public-write endpoint-ზე დამოკიდებულების მოცილება multi-user აპლიკაციისთვის — მიღწეულია decoupling-ით, არა endpoint-ის ფიზიკური shutdown-ით.
- Tests: 63 → 59. 4 Guest-specific tests წაიშალა; 3 tests გადაიწერა login-required behavior-ზე; 56 baseline tests უცვლელი დარჩა. Final: 59/59 passed.
- Verification (დამოუკიდებელი, Claude-ის მხრიდან, fresh clone-ზე): TypeScript 0 errors, 59/59 tests passed, production build successful, `script.google.com` reference არსად (source-ში და build bundle-ში), Guest access production-ზე ხელით დადასტურებულია დაბლოკილად, 2–3 რეალური authenticated სესია ხელით ვერიფიცირებულია Supabase-ში (correct data persistence)

## საკვანძო არქიტექტურული გადაწყვეტილებები (არ შეიცვალოს განხილვის გარეშე)

- DB schema: ზუსტად 4 table (profiles, children, game_sessions, wishes). answers, progress, statistics, achievements ცხრილები განზრახ არ არსებობს (derived/calculated დონეზეა გადაწყვეტილი).
- useGameSession(gameMode, childId) — hook mode-აგნოსტიკურია, აღარ საჭიროებს mode-სპეციფიკურ ცვლილებებს ახალი game mode-ის დამატებისას.
- **Guest Mode არ არსებობს (Phase 2.5, Variant A)** — ყველა მომხმარებელი აუცილებლად authenticated უნდა იყოს Game Screen-ის მისაღწევად.
- Authenticated Mode: sync მიდის supabaseSyncService.ts-ით, RLS-ით დაცული — ეს არის ერთადერთი sync გზა.
- **Google Apps Script public-write endpoint** — `thomthematica2` აღარ არის დამოკიდებული ამ endpoint-ზე. Endpoint განზრახ რჩება აქტიური, მხოლოდ ცალკე legacy `thomthematica` (ერთ-ბავშვიანი) აპლიკაციისთვის — ეს scope-ის მიღმაა და thomthematica2-ის Phase-ებზე გავლენას აღარ ახდენს. Google Apps Script public-write endpoint remains active as a legacy dependency of the separate `thomthematica` application. It is no longer a source, build, or runtime dependency of `thomthematica2`.
- 40-question rolling window (მათემატიკური wish-qualification ლოგიკა) — ხელუხლებელია მთელი ამ პროცესის განმავლობაში, არცერთხელ არ შეცვლილა.

## ცნობილი, განზრახ გადადებული საკითხები

- Reward images per-child theme — children.reward_theme schema-ში ჯერ არ დამატებულა (დაგეგმილია, მაგრამ ჯერ არ განხორციელებულა).
- Parent Dashboard / სტატისტიკის ვიზუალიზაცია — არ დაწყებულა, დაგეგმილია მომავალ ფაზად (Phase 3).
- Active play duration — Page Visibility API-ით უკვე გამართულია (Phase 2.3), დამატებითი idle-timeout არ არის საჭირო ამ ეტაპზე.

## Workflow (როგორ ვმუშაობთ)

1. AI Studio (Gemini) წერს კოდს პატარა, ინკრემენტულ commit-ებად.
2. Claude და ChatGPT ცალ-ცალკე იღებენ commit-ის ლინკს/კოდს და აკეთებენ დამოუკიდებელ code review-ს.
3. ორივეს შენიშვნები ერთმანეთს ეგზავნება, საჭიროებისამებრ ერთიანდება ერთ საბოლოო პრომფთში.
4. საბოლოო პრომფთი გადაეცემა AI Studio-ს შემდეგი commit-ისთვის.
5. ყოველი ფაზის დასრულებისას (ტესტები მწვანე, typecheck სუფთა, build წარმატებული) ეს დოკუმენტი განახლდება.

## შემდეგი ნაბიჯი
[Phase 3: Parent Dashboard — ჯერ არ დაწყებულა, დაგეგმვა საჭიროებს ცალკე sign-off-ს]
