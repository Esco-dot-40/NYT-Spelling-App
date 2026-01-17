import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ANALYTICS_ENDPOINT = '/api/analytics/visit';

export const useAnalytics = () => {
    const location = useLocation();
    const { user } = useAuth();
    const initialized = useRef(false);
    const lastPath = useRef<string | null>(null);

    useEffect(() => {
        if (!user) return;
        if (initialized.current && lastPath.current === location.pathname) return;

        const logVisit = async () => {
            try {
                initialized.current = true;
                lastPath.current = location.pathname;

                // 1. Get IP and Geo Info
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();

                // 2. COMPREHENSIVE Device & Browser Data Collection
                const isDiscord = window.location.search.includes('frame_id');

                // Screen & Display
                const screenWidth = window.screen.width;
                const screenHeight = window.screen.height;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const colorDepth = window.screen.colorDepth;
                const pixelRatio = window.devicePixelRatio || 1;

                // Browser Info
                const userAgent = navigator.userAgent;
                const language = navigator.language;
                const languages = navigator.languages?.join(', ') || language;
                const cookiesEnabled = navigator.cookieEnabled;
                const doNotTrack = navigator.doNotTrack || 'unspecified';

                // Device Info
                const platform = navigator.platform;
                const vendor = navigator.vendor || 'unknown';
                const hardwareConcurrency = (navigator as any).hardwareConcurrency || 'unknown';
                const deviceMemory = (navigator as any).deviceMemory || 'unknown';
                const maxTouchPoints = navigator.maxTouchPoints || 0;
                const touchSupport = maxTouchPoints > 0;

                // Connection Info
                const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
                const connectionType = connection?.effectiveType || 'unknown';
                const downlink = connection?.downlink || 'unknown';
                const rtt = connection?.rtt || 'unknown';
                const saveData = connection?.saveData || false;

                // Timezone
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const timezoneOffset = new Date().getTimezoneOffset();

                // Referrer
                const referrer = document.referrer || 'direct';

                // Battery Status (if available)
                let batteryLevel = 'unknown';
                let batteryCharging = 'unknown';
                try {
                    const battery = await (navigator as any).getBattery?.();
                    if (battery) {
                        batteryLevel = (battery.level * 100).toFixed(0) + '%';
                        batteryCharging = battery.charging ? 'yes' : 'no';
                    }
                } catch (e) {
                    // Battery API not available
                }

                // WebGL Renderer (GPU Info)
                let gpuRenderer = 'unknown';
                try {
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    if (gl) {
                        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
                        if (debugInfo) {
                            gpuRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                        }
                    }
                } catch (e) {
                    // WebGL not available
                }

                // Storage Available
                let localStorageEnabled = false;
                let sessionStorageEnabled = false;
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    localStorageEnabled = true;
                } catch (e) { }
                try {
                    sessionStorage.setItem('test', 'test');
                    sessionStorage.removeItem('test');
                    sessionStorageEnabled = true;
                } catch (e) { }

                // 3. Comprehensive Payload
                const payload = {
                    // User & Location
                    uid: user.uid,
                    ip: ipData.ip,
                    city: ipData.city,
                    country: ipData.country_name,
                    region: ipData.region,
                    postal: ipData.postal,
                    lat: ipData.latitude,
                    lng: ipData.longitude,
                    timezone: timezone,
                    timezone_offset: timezoneOffset,

                    // Page Info
                    path: location.pathname,
                    domain: window.location.hostname,
                    full_url: window.location.href,
                    referrer: referrer,

                    // Platform & Browser
                    platform_type: isDiscord ? 'Discord App' : 'Web',
                    platform_os: platform,
                    user_agent: userAgent,
                    browser_language: language,
                    browser_languages: languages,
                    browser_vendor: vendor,
                    cookies_enabled: cookiesEnabled,
                    do_not_track: doNotTrack,

                    // Screen & Display
                    screen_width: screenWidth,
                    screen_height: screenHeight,
                    viewport_width: viewportWidth,
                    viewport_height: viewportHeight,
                    color_depth: colorDepth,
                    pixel_ratio: pixelRatio,

                    // Device Capabilities
                    hardware_concurrency: hardwareConcurrency,
                    device_memory: deviceMemory,
                    max_touch_points: maxTouchPoints,
                    touch_support: touchSupport,

                    // Connection
                    connection_type: connectionType,
                    connection_downlink: downlink,
                    connection_rtt: rtt,
                    connection_save_data: saveData,

                    // Battery
                    battery_level: batteryLevel,
                    battery_charging: batteryCharging,

                    // GPU
                    gpu_renderer: gpuRenderer,

                    // Storage
                    local_storage_enabled: localStorageEnabled,
                    session_storage_enabled: sessionStorageEnabled,

                    // ISP Info
                    isp: ipData.org || 'unknown',
                    asn: ipData.asn || 'unknown',
                };

                // 4. Send to Backend
                await fetch(ANALYTICS_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                console.log('[Analytics] Comprehensive visit logged for:', user.uid);

            } catch (err) {
                console.error('[Analytics] Failed to log visit:', err);
            }
        };

        logVisit();

    }, [location.pathname, user]);
};
