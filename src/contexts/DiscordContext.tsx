import React, { createContext, useContext, useEffect, useState } from 'react';
import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

const DISCORD_CLIENT_ID = "1451743881854062685";

interface DiscordContextType {
    discordSdk: DiscordSDK | DiscordSDKMock | null;
    auth: any | null;
    isLoading: boolean;
    error: string | null;
}

const DiscordContext = createContext<DiscordContextType>({
    discordSdk: null,
    auth: null,
    isLoading: true,
    error: null,
});

export const useDiscord = () => useContext(DiscordContext);

export const DiscordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [discordSdk, setDiscordSdk] = useState<DiscordSDK | DiscordSDKMock | null>(null);
    const [auth, setAuth] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Primary Setup Effect
    useEffect(() => {
        const setupDiscord = async () => {
            // Force timeout race condition in logic
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection timeout")), 5000)
            );

            try {
                // Check if in Discord iframe
                const isDiscord = window.location.search.includes('frame_id') || window.parent !== window;

                let sdk: DiscordSDK | DiscordSDKMock;

                if (isDiscord) {
                    sdk = new DiscordSDK(DISCORD_CLIENT_ID);
                } else {
                    console.log("Running in browser mode, mocking Discord SDK.");
                    const mock = new DiscordSDKMock(DISCORD_CLIENT_ID, "12345", "mock_discriminator");
                    setDiscordSdk(mock);
                    setIsLoading(false);
                    return;
                }

                // Race against timeout
                await Promise.race([
                    (async () => {
                        await sdk.ready();
                        console.log("Discord SDK Ready");

                        // Authorize
                        const { code } = await sdk.commands.authorize({
                            client_id: DISCORD_CLIENT_ID,
                            response_type: "code",
                            state: "",
                            prompt: "none",
                            scope: [
                                "identify",
                                "guilds",
                            ],
                        });

                        // Exchange code for token and user info via our backend
                        let discordUser = null;
                        try {
                            // Only try to exchange if we aren't in mock mode, or if backend supports it
                            const response = await fetch('/api/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code }),
                            });

                            if (response.ok) {
                                const data = await response.json();
                                discordUser = data.user;
                                setAuth({ ...data, code }); // Store token and user object
                            } else {
                                console.warn("Backend token exchange failed (possibly dev mode), continue with code only.");
                                setAuth({ code });
                            }
                        } catch (e) {
                            console.error("Token exchange network error", e);
                            setAuth({ code });
                        }

                        setDiscordSdk(sdk);
                        console.log("Discord Authenticated", discordUser ? `as ${discordUser.username}` : "");
                    })(),
                    timeoutPromise
                ]);

            } catch (err: any) {
                console.error("Discord SDK Error/Timeout:", err);

                // If we timed out or failed, we STILL want to let the user in.
                if (window.location.search.includes('frame_id')) {
                    setError("Discord Connection Failed: " + (err.message || "Unknown error"));
                }
            } finally {
                // ALWAYS finish loading
                setIsLoading(false);
            }
        };

        setupDiscord();
    }, []);

    // Safety Valve: Force loading to finish after 6 seconds max
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                console.warn("Discord Context: Force finishing loading state due to timeout.");
                setIsLoading(false);
                if (!discordSdk) {
                    setError(prev => prev || "Connection timed out - loaded in offline mode");
                }
            }
        }, 6000);
        return () => clearTimeout(timer);
    }, [isLoading, discordSdk]);

    return (
        <DiscordContext.Provider value={{ discordSdk, auth, isLoading, error }}>
            {children}
        </DiscordContext.Provider>
    );
};
