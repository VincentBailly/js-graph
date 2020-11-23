//const { app, BrowserWindow, ipcMain } = require("electron");
import * as fs from "fs";

import { resolve_peer_dependencies } from "./resolve-peer-dependencies";
import { GraphLink, RegularLink, PeerLink, Tree } from "./types";

import { RGraph } from "./RGraph";

const createTree: <T>() => Tree<T> = require("functional-red-black-tree");

function isRegularLink(link: GraphLink): link is RegularLink {
  return link.type !== "peer";
}

function isPeerLink(link: GraphLink): link is PeerLink {
  return link.type === "peer";
}

const input = fs.readFileSync(process.argv[2]);
const inputGraph : { nodes: string[], links: GraphLink[] } = JSON.parse(input.toString());

const links: Tree<Tree<string>> = inputGraph.links.filter(isRegularLink).reduce((p, n) => {
  const subTree = p.get(n.source);
  if (subTree) {
    return p.remove(n.source).insert(n.source, subTree.insert(n.target, n.target));
  } else {
    return p.insert(n.source, (createTree() as Tree<string>).insert(n.target, n.target));
  }
}, createTree() as Tree<Tree<string>>);

const reversedLinks: Tree<Tree<string>> = inputGraph.links.filter(isRegularLink).reduce((p, n) => {
  const subTree = p.get(n.target);
  if (subTree) {
    return p.remove(n.target).insert(n.target, subTree.insert(n.source, n.source));
  } else {
    return p.insert(n.target, (createTree() as Tree<string>).insert(n.source, n.source));
  }
}, createTree() as Tree<Tree<string>>);

const peerLinks: Tree<Tree<string>> = inputGraph.links.filter(isPeerLink).reduce((p, n) => {
  const subTree = p.get(n.source);
  if (subTree) {
    return p.remove(n.source).insert(n.source, subTree.insert(n.target, n.target));
  } else {
    return p.insert(n.source, (createTree() as Tree<string>).insert(n.target, n.target));
  }
}, createTree() as Tree<Tree<string>>);

const nodes: Tree<string> = inputGraph.nodes.reduce((p, n) => p.insert(n, n), createTree() as Tree<string>);

const rGraph: RGraph = { nodes: nodes, links: links, reversedLinks, peerLinks };


function resolveTreeGraph(graph: RGraph): RGraph {
  const newTreeGraph = resolve_peer_dependencies(graph);
  if (graph === newTreeGraph) {
    return graph;
  }
  return resolveTreeGraph(newTreeGraph);
}

const result = gc(resolveTreeGraph(rGraph));

function visit(input: RGraph, visited: Tree<string>, current: string) : Tree<string> {
  const n1 = visited.insert(current, current);
  const next = input.links.get(current);
  if (!next) {
    return n1;
  }
  const n2 = next.keys.reduce((acc, next) => acc.get(next) ? acc : visit(input, acc, next), n1);
  return n2;
}

function trimLinks2(toKeep: Tree<string>, toTrim: Tree<string>): Tree<string> {
  const start = createTree<string>();
  const result = toTrim.keys.reduce((acc, next) => toKeep.get(next) ? acc.insert(next, next) : acc, start);
  return result;
}

function trimLinks(toKeep: Tree<string>, toTrim: Tree<Tree<string>>): Tree<Tree<string>> {
  const start = createTree<Tree<string>>();
  const result = toTrim.keys.reduce((acc, next) => {
    return toKeep.get(next) ? acc.insert(next, trimLinks2(toKeep, toTrim.get(next) as Tree<string>)) : acc;
  }, start);
  return result
}

function gc(input: RGraph): RGraph {
  const reachable = visit(input, createTree<string>(), "root");
  return { nodes: reachable, links: trimLinks(reachable, input.links), reversedLinks: createTree(), peerLinks: createTree() };
}

console.log(JSON.stringify({ nodes: result.nodes.keys, links: result.links.keys.map(p => (result.links.get(p) as Tree<string>).keys.map(c => ({source: p, target: c}))).reduce((p,n) => [...p, ...n], [])}, undefined, 2));
