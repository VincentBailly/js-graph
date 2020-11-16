import { GraphLink, Graph } from "./types";

type NameAndVersion = { value: string, type: "nameAndVersion" };
type Name = { value: string, type: "name" };
type ResolvedPeerDependency = { parent_relationship: GraphLink, peer_dependency: GraphLink, result: string };

function makeName(name: string): Name {
  return { value: name, type: "name" };
}

function makeNameAndVersion(key: string): NameAndVersion {
  return { value: key, type: "nameAndVersion" };
}

const memo_get_name = new Map<string, Name>();
function get_name(name_and_version: NameAndVersion): Name {
  if (memo_get_name.has(name_and_version.value)) {
    return memo_get_name.get(name_and_version.value);
  }
  const indexOfRelevenAt = name_and_version.value.slice(1).indexOf("@") + 1;
  const result = name_and_version.value.substr(0, indexOfRelevenAt);
  memo_get_name.set(name_and_version.value, makeName(result));
  return makeName(result);
}

function fulfill_peer_dependency(links: GraphLink[], parent_relationship: GraphLink, peer_dependency: GraphLink): string {
  // The parent actually fulfills the peer_dependency
  if (get_name(makeNameAndVersion(parent_relationship.source)).value === peer_dependency.target) {
    return parent_relationship.source;
  }

  const result = links.filter(l => l.source === parent_relationship.source && get_name(makeNameAndVersion(l.target)).value === peer_dependency.target && l.type !== "peer")[0];
  return result ? result.target : undefined;
}

// TODO: to optimize perf, make link as two map of map instead of a flat list
export function resolve_peer_dependencies (input: Graph): Graph {
  debugger
  const active_peer_dependencies = input.links.filter(l => l.type === "peer");
  const packages_with_peer_dependencies = new Set(active_peer_dependencies.map(l => l.source));
  const parent_relationships_for_packages_with_peer_dependencies = input.links
            .filter(l => packages_with_peer_dependencies.has(l.target) && l.type !== "peer");
  const peer_dependencies_to_fulfill = parent_relationships_for_packages_with_peer_dependencies.map(parent_relationship => 
    input.links.filter(peer_dependency => parent_relationship.target === peer_dependency.source && peer_dependency.type === "peer").map(peer_dependency => ({ parent_relationship, peer_dependency}))
  ).reduce((p,n) => ([...p, ...n]), []);

  const fulfilled_peer_dependencies : ResolvedPeerDependency[] = peer_dependencies_to_fulfill.map(({parent_relationship, peer_dependency}) => ({parent_relationship, peer_dependency, result: fulfill_peer_dependency(input.links, parent_relationship, peer_dependency)})).filter(a => a.result !== undefined).sort((a, b) => {
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

  const result = fulfilled_peer_dependencies.reduce((acc, next) => update_graph_with_fullfilled_dependencies(next, acc.nodes, acc.links), input);
  return result;
}

function update_graph_with_fullfilled_dependencies(winner: ResolvedPeerDependency, nodes: string[], links: GraphLink[]): Graph {
  const newPackage = `${winner.peer_dependency.source}+(${winner.result})`;
  if (nodes.filter(n => n === newPackage).length === 1) {
    const new_links = links.filter(l => l !== winner.parent_relationship).concat([{source:winner.parent_relationship.source, target: newPackage, type: "regular" }]);
    return { nodes, links: new_links };

  } else {
    const new_nodes = [...nodes, newPackage];
    const new_links = links.filter(l => l !== winner.parent_relationship).concat(links.filter(l => l.source === winner.peer_dependency.source && l !== winner.peer_dependency).map(l => ({ source: newPackage, target: l.target, type: l.type}))).concat([{source: newPackage, target: winner.result, type: "regular"}, {source:winner.parent_relationship.source, target: newPackage, type: "regular" }]);
    return { nodes: new_nodes, links: new_links };

  }

}
