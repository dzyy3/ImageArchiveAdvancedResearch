/**
 * Image Archive — Conceptual Network
 * D3 force simulation, theme/mood links, hover, drag, parallax.
 * Modular: expand themes in data.json and CONFIG below.
 */

(function () {
  "use strict";

  // ---- Config (expand themes/moods here when adding new ones) ----
  const CONFIG = {
    nodeRadius: 36,
    linkDistance: 180,
    chargeStrength: -400,
    centerStrength: 0.05,
    parallaxFactor: 0.12,
    hoverScale: 1.4,
    connectedScale: 1.1,
    unrelatedOpacity: 0.3,
    lineColor: "#3A86FF",
    lineColorHover: "#6ba3ff",
  };

  let graphData = { nodes: [], links: [] };
  let fullNodes = [];
  let simulation = null;
  let activeThemeFilter = "";
  let hoveredNodeId = null;

  const graphWrapper = document.getElementById("graphWrapper");
  const graphSvg = document.getElementById("graphSvg");
  const filterBar = document.getElementById("filterBar");

  if (!graphWrapper || !graphSvg) return;

  // ---- Data: build links from shared theme or mood ----
  function nodesShareConnection(a, b) {
    const sharedTheme = a.themes.some((t) => b.themes.includes(t));
    const sharedMood = a.moods.some((m) => b.moods.includes(m));
    return sharedTheme || sharedMood;
  }

  function buildLinks(nodes) {
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodesShareConnection(nodes[i], nodes[j])) {
          links.push({ source: nodes[i].id, target: nodes[j].id });
        }
      }
    }
    return links;
  }

  function applyThemeFilter(nodes, theme) {
    if (!theme) return nodes;
    return nodes.filter((n) => n.themes.includes(theme));
  }

  /** Sort nodes by selected tag: matching tag first, then by name (tag line). */
  function sortNodesByTag(nodes, tag) {
    const list = [...nodes];
    if (!tag) {
      return list.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    }
    return list.sort((a, b) => {
      const aHas = a.themes.includes(tag);
      const bHas = b.themes.includes(tag);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
  }

  // ---- Fetch data ----
  async function loadData() {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("Failed to load data.json");
    const raw = await res.json();
    const nodes = (raw.nodes || []).map((d) => ({
      ...d,
      name: d.name || [].concat(d.themes || [], d.moods || []).join(", "),
      themes: Array.isArray(d.themes) ? d.themes : [],
      moods: Array.isArray(d.moods) ? d.moods : [],
    }));
    const links = buildLinks(nodes);
    return { nodes, links };
  }

  // ---- D3 dimensions (responsive) ----
  function getDimensions() {
    const rect = graphWrapper.getBoundingClientRect();
    return {
      width: rect.width || 1200,
      height: Math.max(rect.height, 800),
    };
  }

  // ---- Render: SVG, links, nodes ----
  function initGraph(nodes, links) {
    const { width, height } = getDimensions();
    const dims = { width, height };

    d3.select(graphSvg)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    const g = d3.select(graphSvg).selectChild("g");
    if (!g.empty()) g.remove();

    const container = d3
      .select(graphSvg)
      .append("g")
      .attr("class", "graph-container");

    const linkGroup = container.append("g").attr("class", "links");
    const nodeGroup = container.append("g").attr("class", "nodes");

    const link = linkGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "link")
      .attr("stroke", CONFIG.lineColor);

    const node = nodeGroup
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("data-id", (d) => d.id)
      .attr("title", (d) => d.name || d.id)
      .style("cursor", "pointer");

    const size = CONFIG.nodeRadius * 2;
    node
      .append("image")
      .attr("href", (d) => encodeURI(d.image))
      .attr("x", -CONFIG.nodeRadius)
      .attr("y", -CONFIG.nodeRadius)
      .attr("width", size)
      .attr("height", size)
      .attr("preserveAspectRatio", "xMidYMid slice");

    // Force simulation
    simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(CONFIG.linkDistance)
      )
      .force("charge", d3.forceManyBody().strength(CONFIG.chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(CONFIG.centerStrength))
      .force("collision", d3.forceCollide().radius(CONFIG.nodeRadius * 2.2));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Drag
    node.call(
      d3
        .drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded)
    );

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d3.select(event.sourceEvent.target).closest("g").classed("dragging", true);
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d3.select(event.sourceEvent.target).closest("g").classed("dragging", false);
      d.fx = null;
      d.fy = null;
    }

    // Click: open source URL in new tab
    node.on("click", (event, d) => {
      event.preventDefault();
      if (d.source) window.open(d.source, "_blank", "noopener");
    });

    // Hover: scale and dim
    node
      .on("mouseenter", (event, d) => setHover(d.id))
      .on("mouseleave", () => setHover(null));

    return { node, link, nodes, links, container };
  }

  function setHover(nodeId) {
    hoveredNodeId = nodeId;
    const nodes = graphData.nodes;
    const links = graphData.links;
    if (!nodes.length) return;

    const connectedIds = new Set();
    if (nodeId) {
      links.forEach((l) => {
        const sid = typeof l.source === "object" ? l.source.id : l.source;
        const tid = typeof l.target === "object" ? l.target.id : l.target;
        if (sid === nodeId) connectedIds.add(tid);
        if (tid === nodeId) connectedIds.add(sid);
      });
    }

    d3.select(graphSvg)
      .selectAll(".node")
      .each(function (d) {
        const el = d3.select(this);
        const id = d.id;
        if (!nodeId) {
          el.classed("node-hovered node-connected", false);
          el.transition().duration(200).style("opacity", 1);
          el.select("image").transition().duration(200).attr("transform", "scale(1)");
        } else if (id === nodeId) {
          el.classed("node-hovered", true).classed("node-connected", false);
          el.transition().duration(200).style("opacity", 1);
          el.select("image").transition().duration(200).attr("transform", `scale(${CONFIG.hoverScale})`);
        } else if (connectedIds.has(id)) {
          el.classed("node-hovered", false).classed("node-connected", true);
          el.transition().duration(200).style("opacity", 1);
          el.select("image").transition().duration(200).attr("transform", `scale(${CONFIG.connectedScale})`);
        } else {
          el.classed("node-hovered node-connected", false);
          el.transition().duration(200).style("opacity", CONFIG.unrelatedOpacity);
          el.select("image").transition().duration(200).attr("transform", "scale(1)");
        }
      });

    d3.select(graphSvg)
      .selectAll(".link")
      .each(function (d) {
        const el = d3.select(this);
        const sid = typeof d.source === "object" ? d.source.id : d.source;
        const tid = typeof d.target === "object" ? d.target.id : d.target;
        const isHovered = nodeId && (sid === nodeId || tid === nodeId);
        const isDimmed = nodeId && sid !== nodeId && tid !== nodeId;
        el
          .classed("hovered", isHovered)
          .classed("dimmed", isDimmed)
          .attr("stroke", isHovered ? CONFIG.lineColorHover : CONFIG.lineColor);
      });
  }

  // ---- Theme filter + sort by tag ----
  function rebuildForFilter(theme) {
    activeThemeFilter = theme;
    let filteredNodes = applyThemeFilter(fullNodes, theme);
    filteredNodes = sortNodesByTag(filteredNodes, theme);
    const filteredLinks = buildLinks(filteredNodes);
    if (simulation) simulation.stop();
    initGraph(filteredNodes, filteredLinks);
    graphData.nodes = filteredNodes;
    graphData.links = simulation ? simulation.force("link").links() : filteredLinks;
  }

  function bindFilters() {
    filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const theme = btn.getAttribute("data-theme") || "";
        rebuildForFilter(theme);
      });
    });
  }

  // ---- Parallax on scroll ----
  function initParallax() {
    function onScroll() {
      const container = d3.select(graphSvg).select(".graph-container");
      if (container.empty()) return;
      const y = window.scrollY ?? window.pageYOffset;
      const drift = Number(y * CONFIG.parallaxFactor);
      container.attr("transform", "translate(0," + drift + ")");
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---- Resize ----
  function onResize() {
    const { width, height } = getDimensions();
    d3.select(graphSvg).attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]);
    if (simulation) {
      simulation.force("center", d3.forceCenter(width / 2, height / 2).strength(CONFIG.centerStrength));
      simulation.alpha(0.3).restart();
    }
  }

  window.addEventListener("resize", onResize);

  // ---- Boot ----
  (async function init() {
    const { nodes, links } = await loadData();
    fullNodes = sortNodesByTag(nodes, "");
    graphData = { nodes: fullNodes, links };
    initGraph(fullNodes, links);
    graphData.links = simulation.force("link").links();
    bindFilters();
    initParallax();
  })().catch((err) => {
    console.error(err);
    graphWrapper.innerHTML = "<p style='padding:2rem;color:#e8ecf4'>Failed to load data. Check data.json and the console.</p>";
  });
})();

/**
 * How to add new nodes:
 * 1. Add an object to data.json "nodes" with: id, image, source, themes[], moods[].
 * 2. Use existing theme/mood strings from "meta" (or add new ones there for reference).
 * 3. Nodes connect if they share at least one theme OR one mood.
 * 4. To add new themes/moods: add strings to the node and optionally to data.json "meta";
 *    no code change needed — connection logic is generic.
 */
