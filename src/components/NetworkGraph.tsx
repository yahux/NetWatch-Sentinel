import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import ForceGraph2D, {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';
import type { GraphCaptureHandle, GraphData, GraphNode } from '../types/network';

interface NetworkGraphProps {
  graphData: GraphData;
  onNodeSelect: (deviceId: string | null) => void;
  nodeCount: number;
}

type ForceNode = NodeObject & GraphNode;
type ForceLink = LinkObject & {
  threatLevel: number;
  nodeType: GraphNode['nodeType'];
  isAttackLink?: boolean;
  trafficIntensity?: number;
  packetCount?: number;
};

type ParticlePalette = {
  core: [number, number, number];
  ring: [number, number, number];
  label: string;
};

const FONT = 'JetBrains Mono, monospace';

function useTacticalAnimationLoop() {
  const pulseRef = useRef(0);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const loop = (timestamp: number) => {
      pulseRef.current = timestamp / 1000;
      setFrame(timestamp);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return pulseRef;
}

function prepareCanvas(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getParticlePalette(node: ForceNode): ParticlePalette {
  if (node.isCenter || node.nodeType === 'center') {
    return {
      core: [0, 200, 255],
      ring: [0, 240, 255],
      label: '#00f0ff',
    };
  }
  if (node.nodeType === 'intruder') {
    return {
      core: [255, 30, 60],
      ring: [255, 60, 90],
      label: '#ffb3c1',
    };
  }
  return {
    core: [0, 255, 180],
    ring: [0, 240, 255],
    label: '#b8ffe8',
  };
}

function drawParticleCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  coreRadius: number,
  rgb: [number, number, number]
) {
  const [r, g, b] = rgb;

  const halo = ctx.createRadialGradient(x, y, 0, x, y, coreRadius * 3.5);
  halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.85)`);
  halo.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, 0.35)`);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, coreRadius * 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fill();
}

function drawOrbitRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseRadius: number,
  pulse: number,
  rgb: [number, number, number],
  lineWidth: number
) {
  const [r, g, b] = rgb;
  const breathe = 1 + 0.05 * Math.sin(pulse * 1.6);
  const alpha = 0.14 + 0.1 * Math.sin(pulse * 1.6);

  ctx.beginPath();
  ctx.arc(x, y, baseRadius * breathe, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawGlitchFragments(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  nodeId: string,
  pulse: number,
  globalScale: number
) {
  const seed = hashId(nodeId);
  const fragmentCount = 4;

  for (let i = 0; i < fragmentCount; i++) {
    const phase = seed * 0.017 + i * 1.7;
    const angle = phase + pulse * (2.4 + i * 0.35);
    const orbit = 9 + (i % 2) * 3 + Math.sin(pulse * 6 + i) * 1.8;
    const jitterX = Math.sin(pulse * 18 + i * 4.1) * 2.2;
    const jitterY = Math.cos(pulse * 15 + i * 3.3) * 2.2;
    const fx = x + Math.cos(angle) * orbit + jitterX;
    const fy = y + Math.sin(angle) * orbit + jitterY;
    const size = Math.max(0.75, 1.1 / globalScale);
    const alpha = 0.45 + 0.45 * Math.sin(pulse * 11 + i * 2);

    ctx.fillStyle = `rgba(255, 40, 70, ${alpha})`;
    ctx.fillRect(fx - size / 2, fy - size / 2, size, size);
  }
}

function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  offsetY: number,
  color: string,
  globalScale: number,
  size = 8
) {
  ctx.font = `${size / globalScale}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y + offsetY);
}

function drawParticleNode(
  node: ForceNode,
  ctx: CanvasRenderingContext2D,
  pulse: number,
  globalScale: number
) {
  prepareCanvas(ctx);

  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const palette = getParticlePalette(node);
  const isCenter = node.isCenter || node.nodeType === 'center';
  const isIntruder = node.nodeType === 'intruder';
  const lineWidth = Math.max(0.35, 0.55 / globalScale);

  const coreRadius = isCenter ? 5 : isIntruder ? 3.8 : 3.2;
  const ringRadius = isCenter ? 14 : isIntruder ? 11 : 9.5;

  drawOrbitRing(ctx, x, y, ringRadius, pulse, palette.ring, lineWidth);
  drawParticleCore(ctx, x, y, coreRadius, palette.core);

  if (isIntruder) {
    drawGlitchFragments(ctx, x, y, node.id, pulse, globalScale);
  }

  if (isCenter) {
    drawNodeLabel(
      ctx,
      'LOCAL SERVER',
      x,
      y,
      ringRadius + 5 / globalScale,
      palette.label,
      globalScale,
      10
    );
    return;
  }

  const ip = node.ip ?? node.label;
  const labelColor = isIntruder
    ? `rgba(255, 190, 200, ${0.88 + 0.12 * Math.sin(pulse * 8)})`
    : palette.label;

  drawNodeLabel(
    ctx,
    ip,
    x,
    y,
    ringRadius + 4 / globalScale,
    labelColor,
    globalScale
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getLinkPoint(
  source: ForceNode,
  target: ForceNode,
  t: number,
  isAttack: boolean,
  pulse: number
): { x: number; y: number } {
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;

  if (!isAttack) {
    return { x: lerp(sx, tx, t), y: lerp(sy, ty, t) };
  }

  const jitter = 2.5 * Math.sin(pulse * 22);
  const jitterY = 2.5 * Math.cos(pulse * 19);
  const midX = (sx + tx) / 2 + jitter;
  const midY = (sy + ty) / 2 + jitterY;

  if (t <= 0.5) {
    const local = t * 2;
    return { x: lerp(sx, midX, local), y: lerp(sy, midY, local) };
  }

  const local = (t - 0.5) * 2;
  return {
    x: lerp(midX + jitter * 0.4, tx, local),
    y: lerp(midY - jitterY * 0.4, ty, local),
  };
}

function getLinkSeed(link: ForceLink): number {
  const source = link.source as ForceNode;
  const target = link.target as ForceNode;
  return hashId(`${source.id}->${target.id}`);
}

function drawStreamParticle(
  link: ForceLink,
  ctx: CanvasRenderingContext2D,
  pulse: number,
  globalScale: number
) {
  const source = link.source as ForceNode;
  const target = link.target as ForceNode;
  if (
    source.x == null ||
    source.y == null ||
    target.x == null ||
    target.y == null
  ) {
    return;
  }

  const intensity = Math.min(1, link.trafficIntensity ?? 0.12);
  if (intensity < 0.06) return;

  const isAttack = link.isAttackLink === true;
  const baseSpeed = 0.35 + intensity * 0.45;
  const speed = isAttack ? baseSpeed * 3 : baseSpeed;
  const seed = getLinkSeed(link);
  const phase = (seed % 1000) * 0.001;
  const particleCount = isAttack ? 2 : intensity > 0.45 ? 2 : 1;

  for (let p = 0; p < particleCount; p++) {
    const offset = p / particleCount;
    const t = (pulse * speed + phase + offset) % 1;
    const { x, y } = getLinkPoint(source, target, t, isAttack, pulse);
    const radius = Math.max(1.1, (isAttack ? 2.4 : 1.6) / globalScale);

    if (isAttack) {
      const trailSteps = 5;
      for (let i = 1; i <= trailSteps; i++) {
        const trailT = t - i * 0.035;
        if (trailT < 0) continue;
        const trail = getLinkPoint(source, target, trailT, true, pulse);
        const alpha = 0.65 - i * 0.12;
        const trailRadius = radius * (1 - i * 0.14);

        const trailGlow = ctx.createRadialGradient(
          trail.x,
          trail.y,
          0,
          trail.x,
          trail.y,
          trailRadius * 3
        );
        trailGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
        trailGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = trailGlow;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trailRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trailRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      const coreGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
      coreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      coreGlow.addColorStop(0.35, 'rgba(255, 220, 230, 0.45)');
      coreGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      glow.addColorStop(0, `rgba(0, 240, 255, ${0.35 + intensity * 0.35})`);
      glow.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isAttack ? '#ffffff' : `rgba(0, 240, 255, ${0.75 + intensity * 0.2})`;
    ctx.fill();
  }
}

function drawMinimalLink(
  link: ForceLink,
  ctx: CanvasRenderingContext2D,
  pulse: number,
  globalScale: number
) {
  const source = link.source as ForceNode;
  const target = link.target as ForceNode;
  if (
    source.x == null ||
    source.y == null ||
    target.x == null ||
    target.y == null
  ) {
    return;
  }

  prepareCanvas(ctx);

  const isAttack = link.isAttackLink === true;
  const intensity = Math.min(1, link.trafficIntensity ?? 0.12);
  const baseWidth = 0.35 + intensity * 1.4;
  const lineWidth = Math.max(0.25, baseWidth / globalScale);
  const alpha = 0.12 + intensity * 0.55;

  ctx.save();
  ctx.lineWidth = lineWidth;

  if (isAttack) {
    const jitter = 2.5 * Math.sin(pulse * 22);
    const jitterY = 2.5 * Math.cos(pulse * 19);
    const midX = (source.x + target.x) / 2 + jitter;
    const midY = (source.y + target.y) / 2 + jitterY;

    ctx.strokeStyle = `rgba(255, 70, 90, ${0.25 + intensity * 0.45})`;
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(midX + jitter * 0.4, midY - jitterY * 0.4);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  } else {
    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    if (intensity > 0.45) {
      ctx.strokeStyle = `rgba(0, 240, 255, ${intensity * 0.25})`;
      ctx.lineWidth = lineWidth * 2.2;
      ctx.stroke();
    }
  }

  drawStreamParticle(link, ctx, pulse, globalScale);

  ctx.restore();
}

export default forwardRef<GraphCaptureHandle, NetworkGraphProps>(
  function NetworkGraph({ graphData, onNodeSelect, nodeCount }, ref) {
  const graphRef = useRef<ForceGraphMethods<ForceNode, ForceLink>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const pulseRef = useTacticalAnimationLoop();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({
    captureSnapshot: (scale = 2) => {
      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas) return null;

      try {
        if (scale <= 1) {
          return canvas.toDataURL('image/png');
        }

        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width * scale;
        offscreen.height = canvas.height * scale;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return canvas.toDataURL('image/png');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.scale(scale, scale);
        ctx.drawImage(canvas, 0, 0);
        return offscreen.toDataURL('image/png');
      } catch {
        return null;
      }
    },
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paintNode = useCallback(
    (node: ForceNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      drawParticleNode(node, ctx, pulseRef.current, globalScale);
    },
    []
  );

  const paintLink = useCallback(
    (link: ForceLink, ctx: CanvasRenderingContext2D, globalScale = 1) => {
      drawMinimalLink(link, ctx, pulseRef.current, globalScale);
    },
    []
  );

  const handleNodeClick = useCallback(
    (node: ForceNode) => {
      if (node.isCenter || node.nodeType === 'center') {
        onNodeSelect(null);
        return;
      }
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.d3Force('center')?.strength(0.04);
    fg.d3Force('charge')?.strength(-100);
    fg.d3Force('link')?.distance(110);
  }, [graphData]);

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      graphRef.current?.zoomToFit(400, 80);
    }
  }, [dimensions.width, dimensions.height, nodeCount]);

  const { width, height } = dimensions;

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,102,255,0.06)_0%,_transparent_65%)]" />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.1,
          backgroundImage: `
            radial-gradient(circle, rgba(0, 240, 255, 0.9) 0.75px, transparent 0.75px),
            linear-gradient(rgba(0, 240, 255, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 0.35) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px, 48px 48px, 48px 48px',
          backgroundPosition: '0 0, 0 0, 0 0',
        }}
      />

      {width > 0 && height > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={6}
          linkWidth={0.5}
          enableNodeDrag={false}
          enableZoomInteraction
          enablePanInteraction
          cooldownTicks={120}
          d3AlphaDecay={0.012}
          d3VelocityDecay={0.28}
          d3AlphaMin={0.008}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => 'replace'}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => onNodeSelect(null)}
          onEngineTick={() => {
            graphData.nodes.forEach((node) => {
              if (node.isCenter) {
                node.fx = 0;
                node.fy = 0;
                return;
              }

              const n = node as ForceNode;
              if (n.x == null || n.y == null) return;

              const dist = Math.sqrt(n.x * n.x + n.y * n.y) || 1;
              const isIntruder = node.nodeType === 'intruder';
              const pullStrength = isIntruder ? 0.01 : 0.0015;

              n.vx = (n.vx ?? 0) - (n.x / dist) * pullStrength * 55;
              n.vy = (n.vy ?? 0) - (n.y / dist) * pullStrength * 55;

              const orbit = isIntruder ? 0.02 : 0.008;
              n.vx += (-n.y / dist) * orbit;
              n.vy += (n.x / dist) * orbit;
            });
          }}
        />
      )}
    </div>
  );
});
