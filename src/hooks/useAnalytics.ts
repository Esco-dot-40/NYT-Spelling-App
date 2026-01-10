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
        // Prevent double logging in strict mode or quick re-renders
        if (initialized.current && lastPath.current === location.pathname) return;

        const logVisit = async () => {
            try {
                initialized.current = true;
                lastPath.current = location.pathname;

                // 1. Get IP and Geo Info
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();

                // 2. Prepare Payload
                const payload = {
                    uid: user?.uid || 'anonymous',
                    ip: ipData.ip,
                    city: ipData.city,
                    country: ipData.country_name,
                    lat: ipData.latitude,
                    lng: ipData.longitude,
                    platform: navigator.platform,
                    user_agent: navigator.userAgent,
                    path: location.pathname
                };

                // 3. Send to Backend
                await fetch(ANALYTICS_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                console.log('[Analytics] Logged visit:', location.pathname);

            } catch (err) {
                console.error('[Analytics] Failed to log visit:', err);
            }
        };

        logVisit();

    }, [location.pathname, user?.uid]);
};
