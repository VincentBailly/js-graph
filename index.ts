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

const result = resolveTreeGraph(rGraph);

console.log(JSON.stringify({ nodes: result.nodes.keys, links: result.links.keys.map(p => (result.links.get(p) as Tree<string>).keys.map(c => ({source: p, target: c}))).reduce((p,n) => [...p, ...n], [])}, undefined, 2));

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
  else { event.returnValue = JSON.stringify(result)}
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
