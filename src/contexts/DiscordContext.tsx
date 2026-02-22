import React, { createContext, useContext, useEffect, useState } from 'react';
import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

const DISCORD_CLIENT_ID = "1455079703940694081";

interface DiscordContextType {
    discordSdk: DiscordSDK | DiscordSDKMock | null;
    auth: any | null;
    isLoading: boolean;
    error: string | null;
    authError: string | null;
    loginWithDiscord: () => void;
}

const DiscordContext = createContext<DiscordContextType>({
    discordSdk: null,
    auth: null,
    isLoading: true,
    error: null,
    authError: null,
    loginWithDiscord: () => { },
});

export const useDiscord = () => useContext(DiscordContext);

export const DiscordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [discordSdk, setDiscordSdk] = useState<DiscordSDK | DiscordSDKMock | null>(null);
    const [auth, setAuth] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    const loginWithDiscord = () => {
        const redirectUri = window.location.origin;
        const scopes = encodeURIComponent("identify guilds");
        const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}`;
        window.location.href = url;
    };

    // Primary Setup Effect
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const setupDiscord = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const isDiscord = urlParams.has('frame_id');
                const codeFromUrl = urlParams.get('code');

                let sdk: DiscordSDK | DiscordSDKMock;

                if (isDiscord) {
                    sdk = new DiscordSDK(DISCORD_CLIENT_ID);
                } else {
                    console.log("Running in browser mode.");
                    const mock = new DiscordSDKMock(DISCORD_CLIENT_ID, "12345", "mock_discriminator", "Mock Guild");
                    setDiscordSdk(mock);

                    // Check if we just returned from an OAuth redirect
                    if (codeFromUrl) {
                        try {
                            setAuthError("Exchanging Web OAuth Token...");
                            const response = await fetch('/api/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    code: codeFromUrl,
                                    redirect_uri: window.location.origin
                                }),
                            });

                            if (response.ok) {
                                const data = await response.json();
                                setAuth(data);
                                // Clean up URL
                                window.history.replaceState({}, document.title, window.location.pathname);
                            } else {
                                const errData = await response.json();
                                setAuthError(`Web Auth Failed: ${errData.error || response.statusText}`);
                            }
                        } catch (e: any) {
                            setAuthError(`Web Auth Error: ${e.message}`);
                        }
                    }

                    setIsLoading(false);
                    return;
                }

                // ... (rest of the Discord Iframe logic remains similar but updated for redirect_uri)
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error("Connection timeout"));
                    }, 5000);
                });

                await Promise.race([
                    (async () => {
                        try {
                            setAuthError("Waiting for SDK Ready...");
                            await sdk.ready();
                            setAuthError("SDK Ready. Authorizing...");

                            const { code } = await sdk.commands.authorize({
                                client_id: DISCORD_CLIENT_ID,
                                response_type: "code",
                                state: "",
                                prompt: "none",
                                scope: ["identify", "guilds"],
                            });

                            setAuthError("Authorized. Exchanging Token...");

                            const response = await fetch('/api/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    code,
                                    redirect_uri: window.location.origin
                                }),
                            });

                            if (!response.ok) {
                                throw new Error("Backend Token Exchange Failed");
                            }

                            const data = await response.json();
                            setAuth(data);
                            setAuthError(null);
                            setDiscordSdk(sdk);

                        } catch (e: any) {
                            console.error("Auth Step Failed:", e);
                            setAuthError(`Auth Failed: ${e.message || e}`);
                        }
                    })(),
                    timeoutPromise
                ]);

            } catch (err: any) {
                console.error("Discord SDK Error/Timeout:", err);
                if (window.location.search.includes('frame_id')) {
                    setError("Discord Connection Failed: " + (err.message || "Unknown error"));
                }
            } finally {
                clearTimeout(timeoutId);
                setIsLoading(false);
            }
        };

        setupDiscord();
        return () => clearTimeout(timeoutId);
    }, []);

    // Safety Valve
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    return (
        <DiscordContext.Provider value={{ discordSdk, auth, isLoading, error, authError, loginWithDiscord }}>
            {children}
        </DiscordContext.Provider>
    );
};
