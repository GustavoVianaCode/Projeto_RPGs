import useSWR from 'swr';
import { apiFetch } from '../lib/api';

export interface CardTypeSummary {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

export interface CardItem {
  id: string;
  title: string;
  icon: string | null;
  slug: string;
  cardTypeId: string;
  sortOrder: number;
  folderId: string | null;
  parentCardId: string | null;
  documentId: string;
  cardType?: CardTypeSummary;
  folder?: {
    id: string;
    name: string;
  } | null;
  children?: CardItem[];
}

export interface TimelineSummary {
  id: string;
  name: string;
  description: string | null;
  folderId: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  _count?: { events: number };
}

export interface FolderNode {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  parentId: string | null;
  children: FolderNode[];
  cards: CardItem[];
  timelines: TimelineSummary[];
}

export interface WorldInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
}

export function useWorld(worldId: string | null, token: string | null) {
  return useSWR(
    worldId && token ? [`/worlds/${worldId}`, token] : null,
    ([path, tok]: [string, string]) => apiFetch<WorldInfo>(path, tok),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );
}

export function useFolders(worldId: string | null, token: string | null) {
  return useSWR(
    worldId && token ? [`/worlds/${worldId}/folders/tree`, token] : null,
    ([path, tok]: [string, string]) => apiFetch<FolderNode[]>(path, tok),
    { refreshInterval: 30000 },
  );
}

export function useCards(worldId: string | null, token: string | null) {
  return useSWR(
    worldId && token ? [`/worlds/${worldId}/cards`, token] : null,
    ([path, tok]: [string, string]) => apiFetch<CardItem[]>(path, tok),
    { refreshInterval: 30000 },
  );
}

export function useSidebarTimelines(worldId: string | null, token: string | null) {
  return useSWR(
    worldId && token ? [`/worlds/${worldId}/timelines`, token] : null,
    ([path, tok]: [string, string]) => apiFetch<TimelineSummary[]>(path, tok),
    { refreshInterval: 30000 },
  );
}

function buildCardHierarchy(items: CardItem[]): CardItem[] {
  const cardMap = new Map<string, CardItem>();
  items.forEach((c) => {
    cardMap.set(c.id, { ...c, children: [] });
  });

  const roots: CardItem[] = [];
  cardMap.forEach((card) => {
    if (card.parentCardId && cardMap.has(card.parentCardId)) {
      const parent = cardMap.get(card.parentCardId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(card);
      }
    } else {
      roots.push(card);
    }
  });

  return roots;
}

export function useSidebarTree(worldId: string | null, token: string | null) {
  const { data: folders, mutate: mutateFolders } = useFolders(worldId, token);
  const { data: cards, mutate: mutateCards } = useCards(worldId, token);
  const { data: timelines, mutate: mutateTimelines } = useSidebarTimelines(worldId, token);

  function attachItems(nodes: FolderNode[]): FolderNode[] {
    return nodes.map((node) => {
      const folderCards = (cards ?? []).filter((c) => c.folderId === node.id);
      const folderTimelines = (timelines ?? []).filter((t) => t.folderId === node.id);
      return {
        ...node,
        cards: buildCardHierarchy(folderCards),
        timelines: folderTimelines,
        children: attachItems(node.children),
      };
    });
  }

  const nonFolderCards = (cards ?? []).filter((c) => !c.folderId);
  const rootCards = buildCardHierarchy(nonFolderCards);
  const rootTimelines = (timelines ?? []).filter((t) => !t.folderId);
  const tree = attachItems(folders ?? []);

  return {
    tree,
    rootCards,
    rootTimelines,
    allCards: cards ?? [],
    allTimelines: timelines ?? [],
    isLoading: !folders && !cards,
    mutate: () => {
      void mutateFolders();
      void mutateCards();
      void mutateTimelines();
    },
  };
}
