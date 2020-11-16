export type GraphLink = { source: string, target: string, type: "regular" | "peer" };
export type Graph = { nodes: string[], links: GraphLink[] };

