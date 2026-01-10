import { useEffect, useState } from 'react';

export const LoadingScreen = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 2;
            });
        }, 50);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
            {/* Simple Hexagon Logo Animation */}
            <div className="mb-8 animate-bounce">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-500 fill-current opacity-80">
                        <polygon points="50 5, 95 27, 95 72, 50 95, 5 72, 5 27" />
                    </svg>
                </div>
            </div>

            {/* Loading Text */}
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent animate-pulse">
                SpellOrFail
            </h1>

            <p className="text-lg text-gray-400 mb-8 animate-pulse">
                Loading your daily puzzle...
            </p>

            {/* Progress Bar */}
            <div className="w-80 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Progress Percentage */}
            <p className="text-sm text-gray-500 mt-4">{progress}%</p>
        </div>
    );
};
