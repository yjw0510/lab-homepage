"use client";

import { useEffect, useRef, useCallback } from "react";
import Matter from "matter-js";

interface AtomSimulationProps {
  className?: string;
  particleCount?: number;
  interactive?: boolean;
}

const COLORS = [
  "#06b6d4", // cyan (primary)
  "#8b5cf6", // violet
  "#ef4444", // red (oxygen)
  "#22d3ee", // light cyan
  "#e2e8f0", // light gray (hydrogen)
  "#14b8a6", // teal
];

export default function AtomSimulation({
  className = "",
  particleCount = 30,
  interactive = true,
}: AtomSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);

  const cleanup = useCallback(() => {
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
      renderRef.current = null;
    }
    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
      runnerRef.current = null;
    }
    if (engineRef.current) {
      if (mouseConstraintRef.current) {
        Matter.Composite.remove(
          engineRef.current.world,
          mouseConstraintRef.current
        );
        mouseConstraintRef.current = null;
      }
      Matter.Engine.clear(engineRef.current);
      engineRef.current = null;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create engine with low gravity for floating effect
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.05, scale: 0.001 },
    });
    engineRef.current = engine;

    // Create renderer
    const render = Matter.Render.create({
      canvas,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
        pixelRatio: Math.min(window.devicePixelRatio, 2),
      },
    });
    renderRef.current = render;

    // Create walls (invisible boundaries)
    const wallThickness = 60;
    const walls = [
      Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width + 100, wallThickness, {
        isStatic: true,
        render: { visible: false },
      }),
      Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width + 100, wallThickness, {
        isStatic: true,
        render: { visible: false },
      }),
      Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height + 100, {
        isStatic: true,
        render: { visible: false },
      }),
      Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height + 100, {
        isStatic: true,
        render: { visible: false },
      }),
    ];

    // Create particles
    const particles: Matter.Body[] = [];
    for (let i = 0; i < particleCount; i++) {
      const radius = 4 + Math.random() * 12;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const x = 50 + Math.random() * (width - 100);
      const y = 50 + Math.random() * (height - 100);

      const particle = Matter.Bodies.circle(x, y, radius, {
        restitution: 0.8,
        friction: 0.005,
        frictionAir: 0.002,
        render: {
          fillStyle: color,
          strokeStyle: "transparent",
          lineWidth: 0,
        },
      });

      // Give random initial velocity
      Matter.Body.setVelocity(particle, {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      });

      particles.push(particle);
    }

    // Create bonds between nearby particles (visual pairs)
    const constraints: Matter.Constraint[] = [];
    for (let i = 0; i < Math.min(particleCount, 10); i++) {
      const a = particles[i * 2];
      const b = particles[i * 2 + 1];
      if (a && b) {
        constraints.push(
          Matter.Constraint.create({
            bodyA: a,
            bodyB: b,
            length: 30 + Math.random() * 20,
            stiffness: 0.02,
            damping: 0.1,
            render: {
              strokeStyle: "rgba(6, 182, 212, 0.15)",
              lineWidth: 1,
            },
          })
        );
      }
    }

    Matter.Composite.add(engine.world, [...walls, ...particles, ...constraints]);

    // Interactive mouse constraint
    if (interactive) {
      const mouse = Matter.Mouse.create(render.canvas);
      const mouseConstraint = Matter.MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: 0.1,
          render: { visible: false },
        },
      });
      mouseConstraintRef.current = mouseConstraint;
      Matter.Composite.add(engine.world, mouseConstraint);
      render.mouse = mouse;
    }

    // Run
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      render.canvas.width = newWidth;
      render.canvas.height = newHeight;
      render.options.width = newWidth;
      render.options.height = newHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cleanup();
    };
  }, [particleCount, interactive, cleanup]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
