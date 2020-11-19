import { Tree, TreeGraph } from "./types";

type Name = { value: string, type: "name" };
const createTree: <T>() => Tree<T> = require("functional-red-black-tree");
/*function createTree<T>(): Tree<T> {
  const map = new Map<string, T>();
  return wrapMapInTree(map);
}

function wrapMapInTree<T>(map: Map<string, T>): Tree<T> {
  const result = {
    get: (index: string) => map.get(index),
    insert: (index: string, value: T) => { map.set(index, value); return wrapMapInTree(map); },
    remove: (index: string) => { map.delete(index); return wrapMapInTree(map); },
    values: Array.from(map.values()),
    keys: Array.from(map.keys())
  }
  return result;
}
*/

function makeName(name: string): Name {
  return { value: name, type: "name" };
}

const memo_get_name = new Map<string, Name>();
function get_name(name_and_version: string): Name {
  const memo = memo_get_name.get(name_and_version);
  if (memo) {
    return memo;
  }
  const index = name_and_version.slice(1).indexOf("@");
  const indexOfRelevenAt = index === -1 ? name_and_version.length : index + 1;
  const result = name_and_version.substr(0, indexOfRelevenAt);
  memo_get_name.set(name_and_version, makeName(result));
  return makeName(result);
}

function fulfill_peer_dependency(input: TreeGraph, parent: string, peer: string): string | undefined {
  // The parent actually fulfills the peer_dependency

  if (get_name(parent).value === peer) {
    return parent;
  }
  
  const candidates = (input.regularLink.get(parent) as Tree<string>).values.filter(d => get_name(d).value === peer);
  if (candidates.length > 0) {
    return candidates[0];
  }
  return undefined;
}

export function resolve_peer_dependencies (input: TreeGraph): TreeGraph {
  const packages_with_peer_dependencies = input.peerLinks.keys;
  const parent_relationships_for_packages_with_peer_dependencies = packages_with_peer_dependencies.map(p => (input.invertedRegularLink.get(p) as Tree<string>).keys.map(parent => ({ source: parent, target: p }))).reduce((p,n) => [...p, ...n], []);
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

  const result = fulfilled_peer_dependencies.reduce((acc, next) => update_graph_with_fullfilled_dependencies(next, acc), input);
  return result;
}

function changeRegularLinks(links: Tree<Tree<string>>, parent: string, oldChild: string, newChild: string): Tree<Tree<string>> {
  const oldParentTree = links.get(parent) as Tree<string>;
  const graphWithoutOldParentTree = links.remove(parent);
  const newParentTree = oldParentTree.remove(oldChild).insert(newChild, newChild);
  return graphWithoutOldParentTree.insert(parent, newParentTree);
}

function changeInvertedLinks(invertedLinks: Tree<Tree<string>>, parent: string, oldChild: string, newChild: string): Tree<Tree<string>> {
  const newOldChildTree = (invertedLinks.get(oldChild) as Tree<string>).remove(parent);
  const newChildInvertedLinks = invertedLinks.get(newChild) || createTree() as Tree<string>;
  const newNewChildTree = newChildInvertedLinks.insert(parent, parent);
  const graphWithoutOldChildTrees = invertedLinks.remove(oldChild).remove(newChild);
  return graphWithoutOldChildTrees.insert(oldChild, newOldChildTree).insert(newChild, newNewChildTree);
}

function changeRegularDependency(graph: TreeGraph, parent: string, oldChild: string, newChild: string): TreeGraph {
  const nodes = graph.nodes;
  const newRegularLinks = changeRegularLinks(graph.regularLink, parent, oldChild, newChild);
  const newInvertedLinks = changeInvertedLinks(graph.invertedRegularLink, parent, oldChild, newChild);
  return { nodes, regularLink: newRegularLinks, invertedRegularLink: newInvertedLinks, peerLinks: graph.peerLinks };
}

function createVirtualPackage(graph: TreeGraph, child: string, newChild: string): TreeGraph {
  const nodes = graph.nodes.insert(newChild, newChild);
  const newNodeLinks = graph.regularLink.get(child);
  const newRegularLinks = newNodeLinks !== undefined ? graph.regularLink.insert(newChild, newNodeLinks): graph.regularLink;
  const newPeerLink = graph.peerLinks.get(child);
  const peerLinks = newPeerLink ? graph.peerLinks.insert(newChild, newPeerLink) : graph.peerLinks;
  const invertedLinksNeededToBeUpdated = newNodeLinks !== undefined ? newNodeLinks.keys.map(k => ({name: k, tree: graph.invertedRegularLink.get(k) as Tree<string>})) : [];
  const updatedInvertedLinks = invertedLinksNeededToBeUpdated.reduce((p, n) => {
    return p.remove(n.name).insert(n.name, n.tree.insert(newChild, newChild));
  }, graph.invertedRegularLink);
  return {nodes, regularLink: newRegularLinks, invertedRegularLink: updatedInvertedLinks, peerLinks };
}

function removePeerDependency(graph: TreeGraph, children: string, peer: string): TreeGraph {
  debugger
  const previousPeerLinks = graph.peerLinks.get(children);
  const peerLink = previousPeerLinks ? previousPeerLinks.remove(peer) : undefined;
  const newPeerLinks = peerLink !== undefined && peerLink.values.length > 0 ? graph.peerLinks.remove(children).insert(children, peerLink) : graph.peerLinks.remove(children);
  return { nodes: graph.nodes, regularLink: graph.regularLink, invertedRegularLink: graph.invertedRegularLink, peerLinks: newPeerLinks };
}

 function gc(graph: TreeGraph, oldName: string): TreeGraph {
  const invertedRegularLink2 = graph.invertedRegularLink.get(oldName);
  if (invertedRegularLink2 && invertedRegularLink2.keys.length > 0) {
    return graph;
  }
  const regularLink2 = graph.regularLink.get(oldName)
  const childrenToUpdate = regularLink2 ? regularLink2.keys: [];
  const nodes = graph.nodes.remove(oldName);
  const regularLink = graph.regularLink.remove(oldName);
  const peer = graph.peerLinks.remove(oldName);
  const invertedRegularLink = childrenToUpdate.reduce((p,n) => {
    const node = p.get(n);
    if (!node) {
      throw new Error("RegularLinks and invertedRegularLinks are out of sync");
    }
    const newNode = node.remove(oldName);
    return p.remove(n).insert(n, newNode);
  }, graph.invertedRegularLink).remove(oldName);
  return { nodes, regularLink, peerLinks: peer, invertedRegularLink };
}

function update_graph_with_fullfilled_dependencies(fullfilment: {parent: string, children: string, peer: string, result: string}, graph: TreeGraph): TreeGraph {
  const { parent, children, peer, result } = fullfilment;
  if (graph.nodes.get(children) === undefined || graph.nodes.get(parent) === undefined) {
    // the peer dependency does not exist anymore
    return graph;
  }
  const newPackage = `${children}+(${result})`;
  debugger
  if (graph.nodes.get(newPackage) !== undefined) {
    const g1 = changeRegularDependency(graph, parent, children, newPackage);
    const g3 = removePeerDependency(g1, newPackage, peer);
    const g4 = gc(g3, children);
    return g4;
  } else {
    const g1 = createVirtualPackage(graph, children, newPackage);
    const g2 = changeRegularDependency(g1, parent, children, newPackage);
    const g4 = removePeerDependency(g2, newPackage, peer);
    const g5 = gc(g4, children);
    return g5;
  }

}
