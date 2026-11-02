import useSWR from 'swr';
import { apiFetch } from '../lib/api';

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
}

export function useSidebarTree(worldId: string | null, token: string | null) {
  const { data: folders, mutate: mutateFolders } = useSWR(
    worldId && token ? [`/worlds/${worldId}/folders/tree`, token] : null,
    ([path, tok]: [string, string]) => apiFetch<FolderNode[]>(path, tok),
    { refreshInterval: 30000 },
  );

  const { data: cards, mutate: mutateCards } = useSWR(
    worldId && token ? [`/worlds/${worldId}/cards`, token] : null,
    ([path, tok]: [string, string]) => apiFetch<CardItem[]>(path, tok),
    { refreshInterval: 30000 },
  );

  function attachCards(nodes: FolderNode[]): FolderNode[] {
    return nodes.map((node) => ({
      ...node,
      cards: (cards ?? []).filter((c) => c.folderId === node.id),
      children: attachCards(node.children),
    }));
  }

  const rootCards = (cards ?? []).filter((c) => !c.folderId && !c.parentCardId);
  const tree = attachCards(folders ?? []);

  return {
    tree,
    rootCards,
    isLoading: !folders && !cards,
    mutate: () => {
      void mutateFolders();
      void mutateCards();
    },
  };
}
