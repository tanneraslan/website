"use client";
import { FC, useEffect, useRef } from "react";
import { Canvas } from 'glsl-canvas-js/dist/esm/glsl';

interface ShaderCanvasProps {
  frag: string;
  setUniforms?: { [key: string]: string };
}

const ShaderCanvas: FC<ShaderCanvasProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resizer = (
    canvas: HTMLCanvasElement,
    container: HTMLDivElement
  ): void => {
    canvas.width = container.clientWidth * window.devicePixelRatio;
    canvas.height = container.clientHeight * window.devicePixelRatio;
    canvas.style.width = container.clientWidth + "px";
    canvas.style.height = container.clientHeight + "px";
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const node = canvasRef.current;
    const container = containerRef.current;
    const sandbox = new Canvas(node);

    if (props.setUniforms) {
      for (let k in props.setUniforms) {
        sandbox.setUniform(k, props.setUniforms[k]);
      }
    }

    resizer(node, container);
    sandbox.load(props.frag);

    const handler = () => {
      if (!node || !container) return;

      if (
        node.clientWidth !== container.clientWidth ||
        node.clientHeight !== container.clientHeight
      ) {
        resizer(node, container);
      }
    };

    window.addEventListener("resize", handler);

    return () => {
      window.removeEventListener("resize", handler);
    };
  }, [props.frag, props.setUniforms]);

  return (
    <div
      ref={containerRef}
      className="rounded-md overflow-hidden aspect-square w-full bg-zinc-900"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};

export default ShaderCanvas;
