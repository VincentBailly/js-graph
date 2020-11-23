import { Tree, TreeIterator } from "./types";
import { RGraph, addLink, removeLink, removePeerLink, addNode, removeNode, addPeerLink } from "./RGraph";

const memo_get_name = new Map<string, string>();
function get_name(name_and_version: string): string {
  const memo = memo_get_name.get(name_and_version);
  if (memo) {
    return memo;
  }

  const withoutResolvedPeerDeps = name_and_version.split("+")[0];

  const index = withoutResolvedPeerDeps.slice(1).indexOf("@");
  const indexOfRelevenAt = index === -1 ? withoutResolvedPeerDeps.length : index + 1;
  const result = withoutResolvedPeerDeps.substr(0, indexOfRelevenAt);
  memo_get_name.set(name_and_version, result);
  return result;
}

function testFillfillment(parentChild: TreeIterator<string>, peer: string) : string | undefined {
  const child = parentChild.key;

  if (get_name(child) === peer) {
    return child;
  }
  
  if (parentChild.hasNext) {
    parentChild.next();
    return testFillfillment(parentChild, peer);
  }
  
  return undefined;
}

function getNextFulfillingParent(input: RGraph, parentIter: TreeIterator<string>, peer: string): { parent: string, result: string } | undefined {
  const parent = parentIter.key;

  if (get_name(parent) === peer) {
    return { parent, result: parent };
  }

  const children = input.links.get(parent)
  if (children && children.keys.length !== 0) {
    const result = testFillfillment(children.begin, peer);
    if (result) {
      return { parent, result };
    }
  }

  if (parentIter.hasNext) {
    parentIter.next();
    return getNextFulfillingParent(input, parentIter, peer);
  }
  
  return undefined;
}

function tryFullfillAGivenDependency(input: RGraph, peerDependencies: TreeIterator<string>, child: string): { parent: string, peer: string, result: string } | undefined {
  const peer = peerDependencies.key;

  const parents = input.reversedLinks.get(child)
  if (parents && parents.keys.length !== 0) {
    const result = getNextFulfillingParent(input, parents.begin, peer);
    if (result) {
      return { ...result, peer };
    }
  }

  if (peerDependencies.hasNext) {
    peerDependencies.next()
    return tryFullfillAGivenDependency(input, peerDependencies, child);
  }

  return undefined;
}

function tryFullfillNextPeerDependency(input: RGraph, peerDependencies: TreeIterator<Tree<string>>): { parent: string, children: string, peer: string, result: string } | undefined {
  const child = peerDependencies.key;
  const peers = peerDependencies.value;


  if (peers.keys.length !== 0) {
    const result = tryFullfillAGivenDependency(input, peers.begin, child);
    if (result) {
      return { ...result, children: child };
    }
  }

  if (peerDependencies.hasNext) {
    peerDependencies.next();
    return tryFullfillNextPeerDependency(input, peerDependencies);
  }

  return undefined;
}

export function resolve_peer_dependencies (input: RGraph): RGraph {
  debugger
  if (input.peerLinks.keys.length === 0) {
    return input;
  }

  const nextFullfilledPeerDependency = tryFullfillNextPeerDependency(input, input.peerLinks.begin);
  if (!nextFullfilledPeerDependency) {
    return input;
  }

  const result = update_graph_with_fullfilled_dependencies(nextFullfilledPeerDependency, input);
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
