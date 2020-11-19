import { Tree } from "./types";
import { RGraph, addLink, removeLink, removePeerLink, addNode, removeNode, addPeerLink } from "./RGraph";

type Name = { value: string, type: "name" };

function makeName(name: string): Name {
  return { value: name, type: "name" };
}

const memo_get_name = new Map<string, Name>();
function get_name(name_and_version: string): Name {
  const memo = memo_get_name.get(name_and_version);
  if (memo) {
    return memo;
  }

  const withoutResolvedPeerDeps = name_and_version.split("+")[0];

  const index = withoutResolvedPeerDeps.slice(1).indexOf("@");
  const indexOfRelevenAt = index === -1 ? withoutResolvedPeerDeps.length : index + 1;
  const result = withoutResolvedPeerDeps.substr(0, indexOfRelevenAt);
  memo_get_name.set(name_and_version, makeName(result));
  return makeName(result);
}

function fulfill_peer_dependency(input: RGraph, parent: string, peer: string): string | undefined {
  // The parent actually fulfills the peer_dependency

  if (get_name(parent).value === peer) {
    return parent;
  }
  
  const candidates = (input.links.get(parent) as Tree<string>).values.filter(d => get_name(d).value === peer);
  if (candidates.length > 0) {
    return candidates[0];
  }
  return undefined;
}

export function resolve_peer_dependencies (input: RGraph): RGraph {
  const packages_with_peer_dependencies = input.peerLinks.keys;
  const parent_relationships_for_packages_with_peer_dependencies = packages_with_peer_dependencies.map(p => (input.reversedLinks.get(p) as Tree<string>).keys.map(parent => ({ source: parent, target: p }))).reduce((p,n) => [...p, ...n], []);
  const peer_dependencies_to_fulfill = parent_relationships_for_packages_with_peer_dependencies.map(parent_relationship => 
    (input.peerLinks.get(parent_relationship.target) as Tree<string>).keys.map(peer => ({ parent: parent_relationship.source, children: parent_relationship.target, peer}))).reduce((p,n) => ([...p, ...n]), []);

  const fulfilled_peer_dependencies : {parent: string, children: string, peer: string, result: string}[] = peer_dependencies_to_fulfill.map(({parent, children, peer}) => ({parent, children, peer, result: fulfill_peer_dependency(input, parent, peer)})).filter(a => a.result !== undefined).sort((a, b) => {
    if (a.parent > b.parent) { return 1; }
    if (a.parent < b.parent) { return -1; }
    if (a.children > b.children) { return 1; }
    if (a.children < b.children) { return -1; }
    if ((a.result as string) > (b.result as string)) { return 1; }
    if ((a.result as string) < (b.result as string)) { return -1; }
    return 0;
  }) as {parent: string, children: string, peer: string, result: string}[];

  if (fulfilled_peer_dependencies.length === 0) {
    return input;
  }

  const result = fulfilled_peer_dependencies.slice(0, 1).reduce((acc, next) => update_graph_with_fullfilled_dependencies(next, acc), input);
  return result;
}

function clone(graph: RGraph, child: string, newChild: string): RGraph {
  const g1 = addNode(graph, newChild);
  const linksToCopyOver: string[] = (graph.links.get(child) || { keys: [] }).keys;
  const g2 = linksToCopyOver.reduce((g, l) => addLink(g, newChild, l), g1);

  const peerLinksToCopyOver: string[] = (graph.peerLinks.get(child) || { keys: [] }).keys;
  const g3 = peerLinksToCopyOver.reduce((g, l) => addPeerLink(g, newChild, l), g2);

  return g3;
}

function gc(graph: RGraph, candidate: string): RGraph {
  const parents: string[] = (graph.reversedLinks.get(candidate) || { keys: [] }).keys;
  if (parents.length !== 0) {
    return graph;
  }

  return removeNode(graph, candidate);
}

function update_graph_with_fullfilled_dependencies(fullfilment: {parent: string, children: string, peer: string, result: string}, graph: RGraph): RGraph {
  const { parent, children, peer, result } = fullfilment;
  if (graph.nodes.get(children) === undefined || graph.nodes.get(parent) === undefined) {
    // the peer dependency does not exist anymore
    return graph;
  }
  const newPackage = `${children}+(${result})`;
  if (graph.nodes.get(newPackage) !== undefined) {
    const g2 = addLink(graph, parent, newPackage);
    const g3 = removeLink(g2, parent, children);
    const g6 = gc(g3, children);
    return g6;
  } else {
    const g1 = clone(graph, children, newPackage);
    const g2 = addLink(g1, parent, newPackage);
    const g3 = removeLink(g2, parent, children);
    const g4 = addLink(g3, newPackage, result);
    const g5 = removePeerLink(g4, newPackage, peer);
    const g6 = gc(g5, children);
    return g6;
  }

}
