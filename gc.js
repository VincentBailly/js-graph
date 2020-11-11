exports.gc = function(graph) {
  const visited = new Map();
  const reachable = visit(graph, visited, "root")
  const nodes = graph.nodes.filter(n => reachable.has(n.id));
  const links = graph.links.filter(l => reachable.has(l.source));
  return { nodes, links }
}

function visit(graph, visited, name) {
  const v = new Set([...visited, name]);
  const next_to_visit = [...new Set(graph.links.filter(l => l.source === name).map(l => l.target).filter(n => !v.has(n)))];
  return next_to_visit.reduce((prev, next) => {
    return visit(graph, prev, next);
  }, v)
}
