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

    useEffect(() => {
        const setupDiscord = async () => {
            try {
                // Check if in Discord iframe
                const isDiscord = window.location.search.includes('frame_id') || window.parent !== window;

                let sdk: DiscordSDK | DiscordSDKMock;

                if (isDiscord) {
                    sdk = new DiscordSDK(DISCORD_CLIENT_ID);
                } else {
                    console.log("Running in browser mode, mocking Discord SDK.");
                    // Fallback to mock immediately if not in frame
                    // Using a basic mock to satisfy the types
                    // Note: Mock constructor might vary by version, passing minimal args
                    const mock = new DiscordSDKMock(DISCORD_CLIENT_ID, "12345", "mock_discriminator");
                    setDiscordSdk(mock);
                    setIsLoading(false);
                    return;
                }

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

            } catch (err: any) {
                console.error("Discord SDK Error:", err);

                // If it fails (e.g. strict CSP, or authorize rejected), we fallback to browser mode
                // This ensures the app always loads.
                if (window.location.search.includes('frame_id')) {
                    // If we are definitely in Discord and failed, show error for debugging
                    setError("Discord Connection Failed: " + (err.message || "Unknown error"));
                }

                // Even on error, stop loading so the app (or error screen) can show
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
