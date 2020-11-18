//const { app, BrowserWindow, ipcMain } = require("electron");
import * as fs from "fs";

import { resolve_peer_dependencies } from "./resolve-peer-dependencies";
import { GraphLink, RegularLink, PeerLink, Tree, TreeGraph } from "./types";

type UntypedTree = { get: (key: string) => (any | undefined), insert: (index: string, value: any) => UntypedTree, remove: (index: string) => UntypedTree };

type TreeCreator = () => UntypedTree;
const createTree: TreeCreator = require("functional-red-black-tree");

function isRegularLink(link: GraphLink): link is RegularLink {
  return link.type === "regular";
}

function isPeerLink(link: GraphLink): link is PeerLink {
  return link.type === "peer";
}

const input = fs.readFileSync(process.argv[2]);
const inputGraph : { nodes: string[], links: GraphLink[] } = JSON.parse(input.toString());

const regularLinksTree: Tree<Tree<string>> = inputGraph.links.filter(isRegularLink).reduce((p, n) => {
  const subTree = p.get(n.source);
  return p.remove(n.source).insert(n.source, subTree.insert(n.target, n.target));
}, inputGraph.nodes.reduce((acc, next) => acc.insert(next, createTree() as Tree<string>), createTree() as Tree<Tree<string>>));

const invertedRegularLinksTree: Tree<Tree<string>> = inputGraph.links.filter(isRegularLink).reduce((p, n) => {
  const subTree = p.get(n.target);
  return p.remove(n.target).insert(n.target, subTree.insert(n.source, n.source));
}, inputGraph.nodes.reduce((acc, next) => acc.insert(next, createTree() as Tree<string>), createTree() as Tree<Tree<string>>));

const peerLinksTree: Tree<Tree<string>> = inputGraph.links.filter(isPeerLink).reduce((p, n) => {
  const subTree = p.get(n.source);
  return p.remove(n.source).insert(n.source, subTree.insert(n.target, n.target));
}, inputGraph.nodes.reduce((acc, next) => acc.insert(next, createTree() as Tree<string>), createTree() as Tree<Tree<string>>));

const nodesTree: Tree<string> = inputGraph.nodes.reduce((p, n) => p.insert(n, n), createTree() as Tree<string>);

const treeGraph: TreeGraph = { nodes: nodesTree, peerLinks: peerLinksTree, regularLink: regularLinksTree, invertedRegularLink: invertedRegularLinksTree };


function resolveTreeGraph(treeGraph: TreeGraph): TreeGraph {
  const newTreeGraph = resolve_peer_dependencies(treeGraph);
  if (treeGraph === newTreeGraph) {
    return treeGraph;
  }
  return resolveTreeGraph(newTreeGraph);
}

const result = resolveTreeGraph(treeGraph);

console.log(JSON.stringify({ nodes: result.nodes.keys, links: result.regularLink.keys.map(p => result.regularLink.get(p).keys.map(c => ({source: p, target: c}))).reduce((p,n) => [...p, ...n], [])}, undefined, 2));
/*
function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('index.html');
  //win.webContents.openDevTools();
}

process.stdin.on('data', _d => {
  step = resolve_peer_dependencies(step);
  createWindow();
})

ipcMain.on('get-iterations', (event) => {
  event.returnValue = 1;
})

ipcMain.on('get-graph', (event, i) => {
  if (i === 0) { event.returnValue = steps[0] }
  else { event.returnValue = steps[steps.length - 1]}
})

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
*/
