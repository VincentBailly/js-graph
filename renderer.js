const d3 = require("d3-force");

const { ipcRenderer } = require("electron");

const iterations = ipcRenderer.sendSync('get-iterations');
const body = document.getElementsByTagName("body")[0];

for (let i = 0; i <= iterations ; i++) {
  const graph = JSON.parse(ipcRenderer.sendSync('get-graph',  i));

  let nodes = graph.nodes;
  let links = graph.links;
  nodes = nodes.filter(n => n.id !== "root")
  links = links.filter(l => l.source !== "root")
  const scale = 4;
  const window_size = 800;
  const simulation = d3.forceSimulation(nodes)
          .force("charge", d3.forceManyBody().strength(-50))
          .force("link", d3.forceLink(links).distance(15).id(d => d.id))
          .force("center", d3.forceCenter(window_size / scale / 2, window_size / scale / 2));
  const canvas = document.createElement("canvas");
  canvas.width = window_size;
  canvas.height = window_size;
  body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  simulation.on("tick", (_a) => {
    ctx.clearRect(0,0,window_size,window_size)
    ctx.font = "10px Arial";
    links.forEach(l => {
      const x1 = l.source.x;
      const y1 = l.source.y;
      const x2 = l.target.x;
      const y2 = l.target.y;
      const length = Math.sqrt((x2-x1)**2+(y2-y1)**2);

      const doubleArrow = links.some(o => o.target === l.source && o.source === l.target);
      // Use this when there is a mutual dependency so the two arrows are not on each other
      const away_from_axis = doubleArrow ? 3 : 0; // 3
      const new_x1 = x1 + away_from_axis * (y1-y2)/length + 8 * (x2 - x1) / length;
      const new_y1 = y1 + away_from_axis * (x2-x1)/length + 8 * (y2 - y1) / length;
      const new_x2 = x2 + away_from_axis * (y1-y2)/length - 8 * (x2 - x1) / length;
      const new_y2 = y2 + away_from_axis * (x2-x1)/length - 8 * (y2 - y1) / length;
      ctx.beginPath();
      ctx.moveTo(new_x1 * scale, new_y1 * scale);
      ctx.lineTo(new_x2 * scale, new_y2 * scale);
      ctx.setLineDash([]);
      l.type === "peer" && ctx.setLineDash([5, 3]);
      ctx.stroke();

      const unit_vector_x = (x2 - x1) / length;
      const unit_vector_y = (y2 - y1) / length;
      const first_arrow_unit_x = Math.cos(Math.PI * 3 / 4) * unit_vector_x - Math.sin(Math.PI * 3 / 4) * unit_vector_y;
      const first_arrow_unit_y = Math.sin(Math.PI * 3 / 4) * unit_vector_x + Math.cos(Math.PI * 3 / 4) * unit_vector_y;
      ctx.beginPath();
      ctx.moveTo(new_x2 * scale, new_y2 * scale);
      ctx.lineTo((new_x2 + 3 * first_arrow_unit_x) * scale, (new_y2 + 3 * first_arrow_unit_y) * scale);
      ctx.stroke();

      const second_arrow_unit_x = Math.cos(- Math.PI * 3 / 4) * unit_vector_x - Math.sin(- Math.PI * 3 / 4) * unit_vector_y;
      const second_arrow_unit_y = Math.sin(- Math.PI * 3 / 4) * unit_vector_x + Math.cos(- Math.PI * 3 / 4) * unit_vector_y;
      ctx.beginPath();
      ctx.moveTo(new_x2 * scale, new_y2 * scale);
      ctx.lineTo((new_x2 + 3 * second_arrow_unit_x) * scale, (new_y2 + 3 * second_arrow_unit_y) * scale);
      ctx.stroke();
      // Arrow tip

    });
    nodes.forEach(n => {
      const x = n.x * scale;
      const y = n.y * scale;

      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, scale * Math.PI);
      ctx.fill();
      ctx.fillStyle = "black";
      ctx.fillText(n.id.split("+")[0], x-15, y + 3);
    });
  })

}
