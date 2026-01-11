import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ANALYTICS_ENDPOINT = '/api/analytics/visit';

export const useAnalytics = () => {
    const location = useLocation();
    const { user } = useAuth(); // If we have user info
    const initialized = useRef(false);
    const lastPath = useRef<string | null>(null);

    useEffect(() => {
        // Wait for user to be identified (Guest or Real) to strictly avoid 'anonymous' logs
        if (!user) return;

        // Prevent double logging in strict mode or quick re-renders (idempotency check by path)
        if (initialized.current && lastPath.current === location.pathname) return;

        const logVisit = async () => {
            try {
                initialized.current = true;
                lastPath.current = location.pathname;

                // 1. Get IP and Geo Info
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();

                // 2. Prepare Payload
                const isDiscord = window.location.search.includes('frame_id'); // Discord SDK adds this

                const payload = {
                    uid: user.uid,
                    ip: ipData.ip,
                    city: ipData.city,
                    country: ipData.country_name,
                    lat: ipData.latitude,
                    lng: ipData.longitude,
                    platform: isDiscord ? 'Discord App' : 'Web',
                    domain: window.location.hostname, // Log the specific domain (staging vs prod)
                    user_agent: navigator.userAgent,
                    path: location.pathname
                };

                // 3. Send to Backend
                await fetch(ANALYTICS_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                console.log('[Analytics] Logged visit for:', user.uid);

            } catch (err) {
                console.error('[Analytics] Failed to log visit:', err);
            }
        };

        logVisit();

    }, [location.pathname, user]); // Re-run when user becomes available
};
