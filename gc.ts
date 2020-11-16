import { Graph } from "./types";

export function gc(graph: Graph) {
  const visited: string[] = [];
  const reachable = visit(graph, visited, "root")
  const nodes = graph.nodes.filter(n => reachable.includes(n));
  const links = graph.links.filter(l => reachable.includes(l.source));
  return { nodes, links }
}

function visit(graph: Graph, visited: string[], name: string) {
  const v = [...visited, name];
  const next_to_visit = [...graph.links.filter(l => l.source === name).map(l => l.target).filter(n => !v.includes(n))];
  return next_to_visit.reduce((prev, next) => {
    return visit(graph, prev, next);
  }, v)
}
