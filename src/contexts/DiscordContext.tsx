import React, { createContext, useContext, useEffect, useState } from 'react';
import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

const DISCORD_CLIENT_ID = "1451743881854062685";

interface DiscordContextType {
    discordSdk: DiscordSDK | DiscordSDKMock | null;
    auth: any | null;
    isLoading: boolean;
    error: string | null;
    authError: string | null;
}

const DiscordContext = createContext<DiscordContextType>({
    discordSdk: null,
    auth: null,
    isLoading: true,
    error: null,
    authError: null,
});

export const useDiscord = () => useContext(DiscordContext);

export const DiscordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [discordSdk, setDiscordSdk] = useState<DiscordSDK | DiscordSDKMock | null>(null);
    const [auth, setAuth] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    // Primary Setup Effect
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const setupDiscord = async () => {
            try {
                // Check if in Discord iframe - strict check
                // We rely on frame_id being present in the URL for real Discord environment
                const isDiscord = window.location.search.includes('frame_id');

                let sdk: DiscordSDK | DiscordSDKMock;

                if (isDiscord) {
                    sdk = new DiscordSDK(DISCORD_CLIENT_ID);
                    // Explicitly do NOT set mock data here.
                    // We must wait for sdk.ready() and the token exchange.
                } else {
                    console.log("Running in browser mode, mocking Discord SDK.");
                    const mock = new DiscordSDKMock(DISCORD_CLIENT_ID, "12345", "mock_discriminator");
                    setDiscordSdk(mock);

                    // MOCK AUTH for browser testing so we don't see "Guest"
                    setAuth({
                        user: {
                            id: "mock_user_123",
                            username: "Browser Dev",
                            discriminator: "0000",
                            global_name: "Browser Developer"
                        },
                        access_token: "mock_token"
                    });

                    setIsLoading(false);
                    return;
                }

                // Create a promise that rejects after 5s, but we can clear the timeout
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error("Connection timeout"));
                    }, 5000);
                });

                // Race against timeout
                await Promise.race([
                    (async () => {
                        try {
                            setAuthError("Waiting for SDK Ready...");
                            await sdk.ready();
                            console.log("Discord SDK Ready");
                            setAuthError("SDK Ready. Authorizing...");

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

                            setAuthError("Authorized. Exchanging Token...");
                            console.log("Got auth code", code);

                            // Exchange code for token and user info via our backend
                            const response = await fetch('/api/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code }),
                            });

                            if (!response.ok) {
                                let errorMessage = "Unknown Auth Error";
                                try {
                                    const errorData = await response.json();
                                    errorMessage = errorData.error || errorMessage;
                                    if (errorData.details?.error_description) {
                                        errorMessage += `: ${errorData.details.error_description}`;
                                    }
                                } catch (e) {
                                    errorMessage += " (Non-JSON response)";
                                }
                                // THROW so we hit the catch block and setAuthError properly
                                throw new Error(errorMessage);
                            }

                            const data = await response.json();
                            setAuth({ ...data, code });
                            setAuthError(null); // Success! Clear errors.

                            setDiscordSdk(sdk);
                            console.log("Discord Authenticated", data.user?.username);

                        } catch (e: any) {
                            console.error("Auth Step Failed:", e);
                            setAuthError(`Auth Failed: ${e.message || e}`);
                            // Do NOT set partial auth. Fail hard so the user sees the error.
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
                clearTimeout(timeoutId); // Critical: Clear timeout so it doesn't reject later
                setIsLoading(false);
            }
        };

        setupDiscord();

        return () => clearTimeout(timeoutId);
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
        <DiscordContext.Provider value={{ discordSdk, auth, isLoading, error, authError }}>
            {children}
        </DiscordContext.Provider>
    );
};
