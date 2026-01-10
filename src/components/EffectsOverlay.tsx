import ParticleBackground from './ParticleBackground';

const EffectsOverlay = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-0">
            <ParticleBackground />
        </div>
    );
};

export default EffectsOverlay;
