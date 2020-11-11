function fulfill_peer_dependency(links, parent_relationship, peer_dependency) {
  // The parent actually fulfills the peer_dependency
  if (parent_relationship.source.split("+")[0].split("@")[0] === peer_dependency.target) {
    return parent_relationship.source;
  }

  const result = links.filter(l => l.source === parent_relationship.source && l.target.split("+")[0].split("@")[0] === peer_dependency.target && l.type !== "peer")[0];
  return result ? result.target : undefined;
}

exports.resolve_peer_dependencies = function(input) {
  const active_peer_dependencies = input.links.filter(l => l.type === "peer");
  const packages_with_peer_dependencies = new Set(active_peer_dependencies.map(l => l.source));
  const parent_relationships_for_packages_with_peer_dependencies = input.links
            .filter(l => packages_with_peer_dependencies.has(l.target) && l.type !== "peer");
  const peer_dependencies_to_fulfill = parent_relationships_for_packages_with_peer_dependencies.map(parent_relationship => 
    input.links.filter(peer_dependency => parent_relationship.target === peer_dependency.source && peer_dependency.type === "peer").map(peer_dependency => ({ parent_relationship, peer_dependency}))
  ).reduce((p,n) => ([...p, ...n]), []);

  const fulfilled_peer_dependencies = peer_dependencies_to_fulfill.map(({parent_relationship, peer_dependency}) => ({parent_relationship, peer_dependency, result: fulfill_peer_dependency(input.links, parent_relationship, peer_dependency)})).filter(a => a.result !== undefined).sort((a, b) => {
    if (a.parent_relationship.source > b.parent_relationship.source) { return 1; }
    if (a.parent_relationship.source < b.parent_relationship.source) { return -1; }
    if (a.parent_relationship.target > b.parent_relationship.target) { return 1; }
    if (a.parent_relationship.target < b.parent_relationship.target) { return -1; }
    if (a.peer_dependency.target > b.peer_dependency.target) { return 1; }
    if (a.peer_dependency.target < b.peer_dependency.target) { return -1; }
    return 0;
  });

  if (fulfilled_peer_dependencies.length === 0) {
    return input;
  }

  const winner = fulfilled_peer_dependencies[0];

  const newPackage = `${winner.peer_dependency.source}+(${winner.result})`;
  if (input.nodes.filter(n => n.id === newPackage).length === 1) {
    const nodes = input.nodes;
    const links = input.links.filter(l => l !== winner.parent_relationship).concat([{source:winner.parent_relationship.source, target: newPackage }]);

    return { nodes, links };
  } else {
    const nodes = [...input.nodes, {id:newPackage}];
    const links = input.links.filter(l => l !== winner.parent_relationship).concat(input.links.filter(l => l.source === winner.peer_dependency.source && l !== winner.peer_dependency).map(l => ({ source: newPackage, target: l.target, type: l.type}))).concat([{source: newPackage, target: winner.result}, {source:winner.parent_relationship.source, target: newPackage }]);

    return { nodes, links };
  }
}
