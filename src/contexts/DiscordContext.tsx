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
                        setAuth({ code });
                        setDiscordSdk(sdk);
                        console.log("Discord Authenticated");
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
                // If we forced it and have no SDK, set an error so user knows why it might be broken
                if (!discordSdk) {
                    // Only set error if not already set, to avoid overwriting specific errors
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
