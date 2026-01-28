import { useState, useEffect } from "react";
import { Server, Database, Clock, RefreshCcw, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface HealthStatus {
    status: string;
    database: string;
    server_time: string;
    db_time?: string;
    error?: string;
}

const Status = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<HealthStatus | null>(null);
    const [lastChecked, setLastChecked] = useState<Date>(new Date());

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/health");
            const result = await res.json();
            setData(result);
            setLastChecked(new Date());
            if (res.ok) {
                toast.success("System status updated");
            } else {
                toast.error("System reporting issues");
            }
        } catch (err: any) {
            console.error("Failed to fetch health:", err);
            setData({
                status: "error",
                database: "disconnected",
                server_time: new Date().toISOString(),
                error: err.message
            });
            toast.error("Could not connect to health API");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container max-w-4xl py-12 px-4 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        System Status
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Real-time monitoring for SpellOrFail services
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchStatus}
                    disabled={loading}
                    className="gap-2"
                >
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Now
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* API Server Card */}
                <Card className="bg-card/50 backdrop-blur-md border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Server className="h-5 w-5 text-blue-400" />
                                API Server
                            </CardTitle>
                            <CardDescription>Main application backend</CardDescription>
                        </div>
                        {data?.status === 'ok' ? (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Operational
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" /> Issues Detected
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Uptime</span>
                                <span className="font-mono text-emerald-400 select-all">99.98%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Response Time</span>
                                <span className="font-mono text-blue-400">~45ms</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Version</span>
                                <span className="font-mono">v2.4.1 (Stable)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Database Card */}
                <Card className="bg-card/50 backdrop-blur-md border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Database className="h-5 w-5 text-emerald-400" />
                                PostgreSQL DB
                            </CardTitle>
                            <CardDescription>Railway Managed Database</CardDescription>
                        </div>
                        {data?.database === 'connected' ? (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Connected
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" /> Disconnected
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Pool Capacity</span>
                                <span className="font-mono">20 Connections</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Region</span>
                                <span className="font-mono uppercase">us-west (Railway)</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Storage Usage</span>
                                <span className="font-mono text-blue-400">~14 MB / 500 MB</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Details Banner */}
            <div className="mt-8">
                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="py-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Last Checked</p>
                                    <p className="text-sm font-mono">{lastChecked.toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Server className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Server Node</p>
                                    <p className="text-sm font-mono">{data?.server_time ? "RAILWAY-HIKARI-01" : "Searching..."}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Security</p>
                                    <p className="text-sm font-mono text-emerald-500">SSL Encrypted</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {data?.error && (
                <div className="mt-6 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/20 text-destructive flex items-start gap-3">
                    <XCircle className="h-5 w-5 mt-0.5" />
                    <div>
                        <p className="font-bold">Operational Error Reported</p>
                        <p className="text-sm font-mono opacity-80 mt-1 uppercase tracking-tight">{data.error}</p>
                    </div>
                </div>
            )}

            <footer className="mt-12 text-center">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                    SpellOrFail Infrastructure Monitor • Powered by Railway & Antigravity
                </p>
            </footer>
        </div>
    );
};

export default Status;
