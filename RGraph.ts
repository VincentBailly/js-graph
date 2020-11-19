import { Tree } from "./types";

const createTree: <T>() => Tree<T> = require("functional-red-black-tree");

export type RGraph = {
  nodes: Tree<string>,
  links: Tree<Tree<string>>,
  reversedLinks: Tree<Tree<string>>,
  peerLinks: Tree<Tree<string>>
}

export function addNode(graph: RGraph, name: string): RGraph {
  return { ...graph, nodes: graph.nodes.insert(name, name) };
}

// Use this only if no other package node depends on it.
export function removeNode(graph: RGraph, name: string): RGraph {
  const dependencies: string[] = (graph.links.get(name) || { keys: [] }).keys;
  const g1 = dependencies.reduce((g, d) => removeLink(g, name, d), graph);
  const nodes = g1.nodes.remove(name);
  const peerLinks = g1.peerLinks.remove(name);
  return { ...g1, nodes, peerLinks };
}

export function addLink(graph: RGraph, from: string, to: string): RGraph {
  const newLink = (graph.links.get(from) || createTree<string>()).insert(to, to);
  const links = graph.links.remove(from).insert(from, newLink);

  const newReversedLink = (graph.reversedLinks.get(to) || createTree<string>()).insert(from, from);
  const reversedLinks = graph.reversedLinks.remove(to).insert(to, newReversedLink);

  return { ...graph, links, reversedLinks };
}

export function removeLink(graph: RGraph, from: string, to: string): RGraph {
  const oldLink = graph.links.get(from) as Tree<string>;
  const newLink = oldLink.remove(to);
  const links = newLink.keys.length === 0 ? graph.links.remove(from) : graph.links.remove(from).insert(from, newLink);

  const oldReversedLink = graph.reversedLinks.get(to) as Tree<string>;
  const newReversedLink = oldReversedLink.remove(from);
  const reversedLinks = newReversedLink.keys.length === 0 ? graph.reversedLinks.remove(to) : graph.reversedLinks.remove(to).insert(to, newReversedLink);

  return { ...graph, links, reversedLinks };
}

export function addPeerLink(graph: RGraph, from: string, to: string): RGraph {
  const newPeerLink = (graph.peerLinks.get(from) || createTree<string>()).insert(to, to);
  const peerLinks = graph.peerLinks.remove(from).insert(from, newPeerLink);
  return { ...graph, peerLinks };
}

export function removePeerLink(graph: RGraph, from: string, to: string): RGraph {
  const oldPeerLink = graph.peerLinks.get(from) as Tree<string>;
  const newPeerLink = oldPeerLink.remove(to);
  const peerLinks = newPeerLink.keys.length === 0 ? graph.peerLinks.remove(from) : graph.peerLinks.remove(from).insert(from, newPeerLink);
  return { ...graph, peerLinks };
}
