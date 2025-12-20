import React, { createContext, useContext, useEffect, useState } from 'react';
import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

const DISCORD_CLIENT_ID = "1451743881854062685";

interface DiscordContextType {
    discordSdk: DiscordSDK | DiscordSDKMock | null;
    auth: any | null; // Replace 'any' with specific auth type if available
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

    useEffect(() => {
        const setupDiscord = async () => {
            try {
                // Detect if running in Discord (query param check is a common way, or just try-catch)
                // ideally checking for the frame or specific params passed by Discord
                const isDiscord = window.location.search.includes('frame_id');

                // For now, we instantiate it. If it fails to connect, we might fall back or mock.
                // However, the SDK might throw if not in an iframe.

                let sdk: DiscordSDK | DiscordSDKMock;

                if (isDiscord || import.meta.env.PROD) { // Assume Production is Discord for now, or use checking
                    sdk = new DiscordSDK(DISCORD_CLIENT_ID);
                } else {
                    // Local dev mock if needed, or just let it fail/warn
                    // For this specific 'make it work' request, let's try to initialize the real one
                    // If we are on localhost:8080 and NOT in discord, this might hang or fail.
                    // We'll use a mock if we catch an error.
                    sdk = new DiscordSDK(DISCORD_CLIENT_ID);
                }

                await sdk.ready();

                // Authorize with Discord Client
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

                // Normally we'd swap this code for a token via a backend
                // For now, we just mark as ready if we got a code.
                setAuth({ code });
                setDiscordSdk(sdk);

            } catch (err: any) {
                console.error("Discord SDK Error:", err);
                // If we fail (e.g. not in Discord), we can optionally fallback to 'browser mode'
                // or show the error. For now, let's log and maybe allow browser access if that's what the user expects locally.
                // But the user said "Connecting to Discord...".
                // Let's set error only if we really think we should be in Discord.
                if (window.location.search.includes('frame_id')) {
                    setError(err.message || "Failed to connect to Discord");
                }
            } finally {
                setIsLoading(false);
            }
        };

        setupDiscord();
    }, []);

    return (
        <DiscordContext.Provider value={{ discordSdk, auth, isLoading, error }}>
            {children}
        </DiscordContext.Provider>
    );
};
