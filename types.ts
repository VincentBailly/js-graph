export type RegularLink = { source: string, target: string, type: "regular" };
export type PeerLink = { source: string, target: string, type: "peer" };
export type GraphLink = RegularLink | PeerLink;
export type Graph = { nodes: string[], links: GraphLink[] };

export type TreeIterator<T> = {
  key: string,
  value: T,
  next: () => undefined,
  hasNext: boolean
}

export type Tree<T> = {  
  get(key: string): (undefined | T), 
  insert: (index: string, value: T) => Tree<T>, 
  remove: (index: string) => Tree<T>,
  find: (index: string) => { tree: { root: { value: T } } },
  values: T[],
  keys: string[],
  begin: TreeIterator<T>
};


