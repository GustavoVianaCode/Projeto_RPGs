import useSWR from 'swr';
import { apiFetch } from '../lib/api';

export interface TimelineEventCardItem {
  id: string;
  cardId: string;
  role: string | null;
  card: {
    id: string;
    title: string;
    slug: string;
    icon: string | null;
    documentId: string;
    cardType?: { id: string; name: string; color: string | null } | null;
  };
}

export interface TimelineEventItem {
  id: string;
  worldId: string;
  timelineId: string;
  title: string;
  description: string | null;
  dateText: string;
  sortOrder: number;
  cardId: string | null;
  card?: {
    id: string;
    title: string;
    slug: string;
    icon: string | null;
    documentId: string;
    cardType?: { id: string; name: string; color: string | null } | null;
  } | null;
  eventCards?: TimelineEventCardItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineDetail {
  id: string;
  worldId: string;
  name: string;
  description: string | null;
  folderId: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  folder?: { id: string; name: string } | null;
  events?: TimelineEventItem[];
  _count?: { events: number };
}

export function useTimelines(worldId: string | null, token: string | null) {
  return useSWR(
    worldId && token ? [`/worlds/${worldId}/timelines`, token] : null,
    ([path, tok]: [string, string]) => apiFetch<TimelineDetail[]>(path, tok),
    { refreshInterval: 30000 },
  );
}

export function useTimeline(
  worldId: string | null,
  timelineId: string | null,
  token: string | null,
) {
  return useSWR(
    worldId && timelineId && token
      ? [`/worlds/${worldId}/timelines/${timelineId}`, token]
      : null,
    ([path, tok]: [string, string]) => apiFetch<TimelineDetail>(path, tok),
    { refreshInterval: 15000 },
  );
}

export function useTimelineEvents(
  worldId: string | null,
  timelineId: string | null,
  token: string | null,
) {
  return useSWR(
    worldId && timelineId && token
      ? [`/worlds/${worldId}/timelines/${timelineId}/events`, token]
      : null,
    ([path, tok]: [string, string]) => apiFetch<TimelineEventItem[]>(path, tok),
    { refreshInterval: 15000 },
  );
}
