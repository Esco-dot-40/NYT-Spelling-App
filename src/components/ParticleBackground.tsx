import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Particle {
    id: string;
    elem: any; // Using any for CreateJS shapes from global scope
    fromX: number;
    toX: number;
    areaHeight: number;
    ballwidth: number;
    alphamax: number;
    color: string;
    fill: boolean;

    speed: number;
    initY: number;
    initX: number;
    distance: number;
    flag: string;
    scaleX?: number;
    scaleY?: number;
    x?: number;
    y?: number;
    alpha?: number;
    alphaMax?: number;
}

interface Light {
    ellipseWidth: number;
    ellipseHeight: number;
    alpha: number;
    offsetX: number;
    offsetY: number;
    color: string;
    elem?: any;
    initX?: number;
    initY?: number;
}

const ParticleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particleArray = useRef<any[]>([]);
    const lights = useRef<Light[]>([
        { ellipseWidth: 400, ellipseHeight: 100, alpha: 0.6, offsetX: 0, offsetY: 0, color: "#6ac6e8" },
        { ellipseWidth: 350, ellipseHeight: 250, alpha: 0.3, offsetX: -50, offsetY: 0, color: "#54d5e8" },
        { ellipseWidth: 100, ellipseHeight: 80, alpha: 0.2, offsetX: 80, offsetY: -50, color: "#2ae8d8" }
    ]);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const particleSettings = useRef([
        { id: "small", num: isMobile ? 80 : 300, fromX: 0, toX: 0, ballwidth: 3, alphamax: 0.4, areaHeight: .5, color: "#0cdbf3", fill: false },
        { id: "medium", num: isMobile ? 30 : 100, fromX: 0, toX: 0, ballwidth: 8, alphamax: 0.3, areaHeight: 1, color: "#6fd2f3", fill: true },
        { id: "large", num: isMobile ? 5 : 10, fromX: 0, toX: 0, ballwidth: 30, alphamax: 0.2, areaHeight: 1, color: "#93e9f3", fill: true }
    ]);

    // Utils
    const range = (min: number, max: number) => min + (max - min) * Math.random();
    const round = (num: number, precision: number) => {
        var decimal = Math.pow(10, precision);
        return Math.round(decimal * num) / decimal;
    };
    const weightedRange = (to: number, from: number, decimalPlaces: number, weightedRange: number[], weightStrength: number) => {
        if (typeof from === "undefined" || from === null) from = 0;
        if (typeof decimalPlaces === "undefined" || decimalPlaces === null) decimalPlaces = 0;
        if (typeof weightedRange === "undefined" || weightedRange === null) weightedRange = [0, 0];
        if (typeof weightStrength === "undefined" || weightStrength === null) weightStrength = 0;

        var ret
        if (to == from) { return (to); }

        if (weightedRange && Math.random() <= weightStrength) {
            ret = round(Math.random() * (weightedRange[1] - weightedRange[0]) + weightedRange[0], decimalPlaces)
        } else {
            ret = round(Math.random() * (to - from) + from, decimalPlaces)
        }
        return (ret);
    };

    useEffect(() => {
        if (!canvasRef.current) return;

        let stage: any;
        let totalWidth: number;
        let totalHeight: number;
        let compositeStyle = "lighter";

        // Poll for CreateJS from window
        const init = () => {
            // @ts-ignore
            const createjs = window.createjs;

            if (!createjs) {
                // Try again in 100ms
                setTimeout(init, 100);
                return;
            }

            stage = new createjs.Stage(canvasRef.current);
            const canvas = canvasRef.current;
            if (!canvas) return;

            const resize = () => {
                totalWidth = canvas.width = canvas.offsetWidth;
                totalHeight = canvas.height = canvas.offsetHeight;
            };
            resize();
            window.addEventListener('resize', resize);

            stage.compositeOperation = compositeStyle;

            // Draw Bg Light
            const drawBgLight = () => {
                let light: any;
                let bounds;
                let blurFilter;
                for (var i = 0, len = lights.current.length; i < len; i++) {
                    light = new createjs.Shape();
                    light.graphics.beginFill(lights.current[i].color).drawEllipse(0, 0, lights.current[i].ellipseWidth, lights.current[i].ellipseHeight);
                    light.regX = lights.current[i].ellipseWidth / 2;
                    light.regY = lights.current[i].ellipseHeight / 2;
                    light.y = totalHeight / 2 + lights.current[i].offsetY;
                    light.x = totalWidth / 2 + lights.current[i].offsetX;

                    // Store init pos
                    (light as any).initY = light.y;
                    (light as any).initX = light.x;

                    blurFilter = new createjs.BlurFilter(lights.current[i].ellipseWidth, lights.current[i].ellipseHeight, 1);
                    bounds = blurFilter.getBounds();
                    light.filters = [blurFilter];
                    light.cache(bounds.x - lights.current[i].ellipseWidth / 2, bounds.y - lights.current[i].ellipseHeight / 2, bounds.width * 2, bounds.height * 2);
                    light.alpha = lights.current[i].alpha;

                    light.compositeOperation = "screen";
                    stage.addChildAt(light, 0);

                    lights.current[i].elem = light;
                }

                if (lights.current[0].elem) {
                    gsap.fromTo(lights.current[0].elem, { scaleX: 1.5, x: (lights.current[0].elem as any).initX, y: (lights.current[0].elem as any).initY }, { duration: 10, yoyo: true, repeat: -1, ease: "power1.inOut", scaleX: 2, scaleY: 0.7 });
                }
                if (lights.current[1].elem) {
                    gsap.fromTo(lights.current[1].elem, { x: (lights.current[1].elem as any).initX, y: (lights.current[1].elem as any).initY }, { duration: 12, delay: 5, yoyo: true, repeat: -1, ease: "power1.inOut", scaleY: 2, scaleX: 2, y: totalHeight / 2 - 50, x: totalWidth / 2 + 100 });
                }
                if (lights.current[2].elem) {
                    gsap.fromTo(lights.current[2].elem, { x: (lights.current[2].elem as any).initX, y: (lights.current[2].elem as any).initY }, { duration: 8, delay: 2, yoyo: true, repeat: -1, ease: "power1.inOut", scaleY: 1.5, scaleX: 1.5, y: totalHeight / 2, x: totalWidth / 2 - 200 });
                }
            };

            const applySettings = (circle: any, positionX: number, totWidth: number, areaHeight: number) => {
                circle.speed = range(1, 3);
                circle.initY = weightedRange(0, totalHeight, 1, [totalHeight * (2 - areaHeight / 2) / 4, totalHeight * (2 + areaHeight / 2) / 4], 0.8);
                circle.initX = weightedRange(positionX, totWidth, 1, [positionX + ((totWidth - positionX)) / 4, positionX + ((totWidth - positionX)) * 3 / 4], 0.6);
            };

            const animateBall = (ball: any) => {
                var scale = range(0.3, 1);
                var xpos = range(ball.initX - ball.distance, ball.initX + ball.distance);
                var ypos = range(ball.initY - ball.distance, ball.initY + ball.distance);
                var speed = ball.speed;

                gsap.to(ball, { duration: speed, scaleX: scale, scaleY: scale, x: xpos, y: ypos, onComplete: () => animateBall(ball), ease: "cubic.inOut" });
                gsap.to(ball, { duration: speed / 2, alpha: range(0.1, ball.alphaMax), onComplete: () => fadeout(ball, speed) });
            };

            const fadeout = (ball: any, speed: number) => {
                ball.speed = range(2, 10);
                gsap.to(ball, { duration: speed / 2, alpha: 0 });
            };

            const drawParticles = () => {
                let blurFilter;
                // @ts-ignore
                const createjs = window.createjs;

                for (var i = 0, len = particleSettings.current.length; i < len; i++) {
                    var ball = particleSettings.current[i];
                    ball.toX = totalWidth;

                    var circle;
                    for (var s = 0; s < ball.num; s++) {
                        circle = new createjs.Shape();
                        if (ball.fill) {
                            circle.graphics.beginFill(ball.color).drawCircle(0, 0, ball.ballwidth);
                            blurFilter = new createjs.BlurFilter(ball.ballwidth / 2, ball.ballwidth / 2, 1);
                            circle.filters = [blurFilter];
                            var bounds = blurFilter.getBounds();
                            circle.cache(-50 + bounds.x, -50 + bounds.y, 100 + bounds.width, 100 + bounds.height);
                        } else {
                            circle.graphics.beginStroke(ball.color).setStrokeStyle(1).drawCircle(0, 0, ball.ballwidth);
                        }

                        circle.alpha = range(0, 0.1);
                        (circle as any).alphaMax = ball.alphamax;
                        (circle as any).distance = ball.ballwidth * 2;
                        (circle as any).ballwidth = ball.ballwidth;
                        (circle as any).flag = ball.id;

                        applySettings(circle, ball.fromX, ball.toX, ball.areaHeight);

                        (circle as any).speed = range(2, 10);
                        circle.y = (circle as any).initY;
                        circle.x = (circle as any).initX;
                        circle.scaleX = circle.scaleY = range(0.3, 1);

                        stage.addChild(circle);
                        animateBall(circle);
                        particleArray.current.push(circle);
                    }
                }
            };

            drawBgLight();
            drawParticles();

            createjs.Ticker.addEventListener("tick", () => stage.update());
        };

        // Start initialization attempt
        init();

        return () => {
            // Cleanup if needed
        }
    }, []);

    return (
        <canvas
            ref={canvasRef}
            id="projector"
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
                background: 'linear-gradient(0deg, #191d1e 50%, #283139 100%)'
            }}
        />
    );
};

export default ParticleBackground;
