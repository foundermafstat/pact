"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
attribute vec2 aGrid;
attribute float aSeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uAspect;
uniform float uReveal;
uniform float uHover;

varying float vAlpha;
varying float vGold;
varying float vGlow;

float periodicNoise(vec3 p, float time) {
  float noise = 0.0;
  noise += sin(p.x * 2.0 + time) * cos(p.z * 1.5 + time);
  noise += sin(p.x * 3.2 + time * 2.0) * cos(p.z * 2.1 + time) * 0.6;
  noise += sin(p.x * 1.7 + time) * cos(p.z * 2.8 + time * 3.0) * 0.4;
  noise += sin(p.x * p.z * 0.5 + time * 2.0) * 0.3;
  return noise * 0.3;
}

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float pulseEnvelope(float phase) {
  float rise = smoothstep(0.08, 0.34, phase);
  float hold = 1.0 - smoothstep(0.46, 0.92, phase);
  return rise * hold;
}

void main() {
  float planeScale = 9.6;
  float x = aGrid.x * planeScale;
  float z = aGrid.y * planeScale;
  float t = uTime * 0.82;

  vec3 noiseInput = vec3(x, 0.0, z) * 0.12;
  float dx = periodicNoise(noiseInput + vec3(0.0, 0.0, 0.0), t);
  float dy = periodicNoise(noiseInput + vec3(50.0, 0.0, 0.0), t + 2.094);
  float dz = periodicNoise(noiseInput + vec3(0.0, 50.0, 0.0), t + 4.188);

  vec3 pos = vec3(
    x + dx * 1.2,
    dy * 2.2 + sin(t * 0.65 + aSeed * 9.0) * 0.04,
    z + dz * 1.2
  );

  float cy = cos(-0.48);
  float sy = sin(-0.48);
  float rx = pos.x * cy - pos.z * sy;
  float rz = pos.x * sy + pos.z * cy;

  float cx = cos(0.54);
  float sx = sin(0.54);
  float ry = pos.y * cx - rz * sx;
  float rz2 = pos.y * sx + rz * cx;

  float perspective = 5.4 / (5.4 + rz2);
  vec2 clip = vec2(
    rx * perspective * 0.25 / max(uAspect, 0.72),
    ry * perspective * 0.27 - 0.02
  );

  gl_Position = vec4(clip, 0.0, 1.0);

  float distanceFromCenter = length(aGrid);
  float organicEdge = periodicNoise(vec3(aGrid * 2.6, aSeed), 0.0) * 0.12;
  float revealMask = 1.0 - smoothstep(uReveal - 0.12, uReveal + 0.18, distanceFromCenter + organicEdge);
  float fieldMask = smoothstep(1.1, 0.1, distanceFromCenter);

  float cycleSpeed = mix(0.06, 0.18, hash(aSeed * 41.7));
  float cyclePhase = fract(uTime * cycleSpeed + hash(aSeed * 311.7));
  float sparkleMask = smoothstep(0.58, 1.0, hash(aSeed * 97.3));
  float softPulse = pulseEnvelope(cyclePhase);
  float secondaryBreath = 0.5 + 0.5 * sin(uTime * mix(0.35, 0.85, hash(aSeed * 53.1)) + aSeed * 8.0);
  float sparklePulse = sparkleMask * softPulse;
  float baseFlicker = secondaryBreath * 0.08 * hash(aSeed * 13.0);
  float hoverGain = mix(1.0, 1.65, uHover);

  vGold = smoothstep(0.74, 1.0, hash(aSeed * 19.7));
  vGlow = sparklePulse;
  vAlpha = revealMask * fieldMask * hoverGain * (0.12 + baseFlicker + sparklePulse * 0.82 + hash(aSeed * 13.0) * 0.12);

  gl_PointSize = max(1.15, (1.28 + softPulse * sparkleMask * 3.4 + uHover * 1.1) * uPixelRatio * perspective);
}
`;

const fragmentShaderSource = `
precision highp float;

varying float vAlpha;
varying float vGold;
varying float vGlow;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float distanceFromCenter = dot(point, point);
  if (distanceFromCenter > 1.0) {
    discard;
  }

  float softEdge = smoothstep(1.0, 0.08, distanceFromCenter);
  vec3 white = vec3(1.0);
  vec3 gold = vec3(1.0, 0.78, 0.0);
  vec3 color = mix(white, gold, vGold * 0.38 + vGlow * 0.18);
  color *= 1.0 + vGlow * 0.65;

  gl_FragColor = vec4(color, vAlpha * softEdge);
}
`;

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create WebGL shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
};

const createProgram = (gl: WebGLRenderingContext): WebGLProgram => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create WebGL program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown program error";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
};

const createParticleData = (size: number): Float32Array => {
  const data = new Float32Array(size * size * 3);
  let index = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      data[index] = (x / (size - 1)) * 2 - 1;
      data[index + 1] = (y / (size - 1)) * 2 - 1;
      data[index + 2] = index * 0.00317;
      index += 3;
    }
  }

  return data;
};

export function WebglParticles({ hovering }: { hovering: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveringRef = useRef(hovering);

  useEffect(() => {
    hoveringRef.current = hovering;
  }, [hovering]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "high-performance"
    });

    if (!gl) {
      canvas.dataset.webglUnsupported = "true";
      return undefined;
    }
    canvas.dataset.webglActive = "true";

    let frameId = 0;
    let hoverValue = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particleGridSize = window.innerWidth < 760 ? 128 : 192;
    const particleCount = particleGridSize * particleGridSize;
    const startedAt = performance.now();

    const program = createProgram(gl);
    const particleBuffer = gl.createBuffer();
    const particleData = createParticleData(particleGridSize);

    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.STATIC_DRAW);
    gl.useProgram(program);

    const stride = 3 * Float32Array.BYTES_PER_ELEMENT;
    const aGrid = gl.getAttribLocation(program, "aGrid");
    const aSeed = gl.getAttribLocation(program, "aSeed");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uPixelRatio = gl.getUniformLocation(program, "uPixelRatio");
    const uAspect = gl.getUniformLocation(program, "uAspect");
    const uReveal = gl.getUniformLocation(program, "uReveal");
    const uHover = gl.getUniformLocation(program, "uHover");

    gl.enableVertexAttribArray(aGrid);
    gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, width, height);
      gl.uniform1f(uPixelRatio, pixelRatio);
      gl.uniform1f(uAspect, width / height);
    };

    const render = (now: number) => {
      resize();
      const elapsed = reduceMotion ? 3.5 : (now - startedAt) / 1000;
      const targetHover = hoveringRef.current ? 1 : 0;
      hoverValue += (targetHover - hoverValue) * 0.08;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, reduceMotion ? 1.2 : elapsed);
      gl.uniform1f(uReveal, Math.min(1.55, 0.12 + elapsed * 0.42));
      gl.uniform1f(uHover, hoverValue);
      gl.drawArrays(gl.POINTS, 0, particleCount);

      if (!reduceMotion) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    render(performance.now());
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
      gl.deleteBuffer(particleBuffer);
      gl.deleteProgram(program);
      delete canvas.dataset.webglActive;
    };
  }, []);

  return (
    <div className="template-particles webgl-particles" aria-hidden="true">
      <canvas ref={canvasRef} />
      <span className="particle particle-a" />
      <span className="particle particle-b" />
      <span className="particle particle-c" />
    </div>
  );
}
