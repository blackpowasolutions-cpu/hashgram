# Reels App

A TikTok-style vertical reels mobile app built with Expo/React Native, featuring social feeds, messaging, gifting, and gamification.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Socket.IO (real-time messaging)
- DB: PostgreSQL + Drizzle ORM
- Mobile: Expo SDK 54, expo-router v6, React Native 0.81.5
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo app (all screens, context, components)
- `artifacts/api-server/` — Express + Socket.IO backend
- `artifacts/mobile/app/(tabs)/` — Tab screens: index (Reels), feed (Feed), store (Store), leaderboard (Ranks), profile (Profile), settings (Settings)
- `artifacts/mobile/app/user/[userId].tsx` — Other-user profile screen
- `artifacts/mobile/app/chat/[userId].tsx` — Private messaging screen
- `artifacts/mobile/context/AuthContext.tsx` — Auth state (User interface with avatarUri, website)
- `artifacts/mobile/context/SocialContext.tsx` — APP_USERS (10 users), follow state, user posts/reels
- `artifacts/mobile/context/MessagesContext.tsx` — Real-time messaging via Socket.IO
- `artifacts/mobile/context/StoreContext.tsx` — Gift card store with 5-level access system
- `artifacts/mobile/components/ScratchCard.tsx` — Scratch card modal component

## Architecture decisions

- Social graph is client-side (SocialContext) with AsyncStorage persistence — no backend endpoint needed for MVP
- Real-time messaging uses Socket.IO rooms, bridged through MessagesContext
- Gift card store has a 5-tier access system (Bronze → Diamond) tied to points
- Scratch cards unlock per-reel at 100 play milestones — purely local state
- User IDs "1"–"10" canonical across leaderboard, feed, SocialContext, and REELS userId map

## Product

- **Reels feed**: TikTok-style vertical scroll, double-tap to like, clickable creator avatar → profile
- **Newsfeed**: Facebook-style posts with 6-emoji reactions, clickable avatar → user profile
- **Gift card store**: 5-level access tiers, purchasable gift cards
- **Leaderboard**: Top 10 with podium, point breakdowns, clickable rows → user profile
- **Profile (own)**: Edit profile (name/username/bio/website/avatar), 3 tabs (Reels+scratch cards / Posts / Liked), followers/following modals
- **Profile (other users)**: Reels + Posts tabs, Follow/Unfollow, Message button, followers/following modals
- **Messaging**: Real-time private chat via Socket.IO, unread badge on reels tab
- **Scratch cards**: Unlock at 100 reel plays, reveals gift card prizes

## User preferences

- Tab order: index (Home/Reels) | feed (Feed) | store (Store) | leaderboard (Ranks) | profile (Profile) | settings (Settings)
- User IDs: "1"=Dance Queen, "2"=Sk8er Pro, "3"=Wanderlust, "4"=Street Food King, "5"=Style Queen, "6"–"10"=other users
- Demo login user has id="1" (Dance Queen)
- Avoid `textShadow` shorthand in StyleSheet.create — use platform-specific shadow props instead
- Router dynamic paths need `as any` cast: `router.push({ pathname: "/user/[userId]" as any, params: { userId } })`

## Gotchas

- CONTACT_ID_MAP in SocialContext maps user IDs to Socket.IO conversation IDs for DM routing
- Nested TouchableOpacity inside Pressable works fine in RN but avoid on web if possible
- `pointerEvents` as a prop is deprecated — use `style.pointerEvents` instead
- `expo-av` is deprecated in SDK 54 — use `expo-audio`/`expo-video` if audio/video is added

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
