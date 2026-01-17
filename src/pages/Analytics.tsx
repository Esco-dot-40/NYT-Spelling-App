import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Users, Eye, Globe, Activity, Monitor, Wifi, Clock, Link2, Server, Cpu, Battery, Smartphone } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Fix Leaflet icon issue
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface AnalyticsData {
    total_visits: number;
    unique_visitors: number;
    active_now: number;
    new_vs_returning: { new_visitors: string; returning_visitors: string };
    platforms: { platform_type: string; count: string }[];
    operating_systems: { platform_os: string; count: string }[];
    screen_resolutions: { resolution: string; count: string }[];
    connection_types: { connection_type: string; count: string }[];
    timezones: { timezone: string; count: string }[];
    top_referrers: { referrer: string; count: string }[];
    top_isps: { isp: string; count: string }[];
    device_capabilities: {
        avg_cores: string;
        avg_memory: string;
        touch_devices: string;
        non_touch_devices: string;
    };
    recent_visits: any[];
    geo_data: { lat: number; lng: number; city: string; country: string; count: string }[];
}

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const Analytics = () => {
    const [password, setPassword] = useState('');
    const [authenticated, setAuthenticated] = useState(false);

    // Simple client-side auth for now as requested
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'Poncholove20!!') {
            setAuthenticated(true);
            localStorage.setItem('analytics_auth', 'true');
        } else {
            alert('Incorrect password');
        }
    };

    useEffect(() => {
        if (localStorage.getItem('analytics_auth') === 'true') {
            setAuthenticated(true);
        }
    }, []);

    const { data, isLoading } = useQuery<AnalyticsData>({
        queryKey: ['analytics_summary'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/summary');
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        },
        enabled: authenticated,
        refetchInterval: 30000 // Refresh every 30s
    });

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center relative z-50 bg-gradient-to-br from-background via-background to-primary/5">
                <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl border-primary/30 shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                            <Activity className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            Analytics Dashboard
                        </CardTitle>
                        <CardDescription>Enter admin password to access comprehensive analytics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-12 w-full rounded-lg border-2 border-input bg-background/50 px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary transition-all"
                                placeholder="Enter password"
                                autoFocus
                            />
                            <button className="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-white font-semibold hover:opacity-90 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg">
                                🔓 Unlock Dashboard
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center relative z-50">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground font-medium">Loading comprehensive analytics...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center relative z-50 space-y-4">
                <Card className="p-6 border-destructive/50 bg-destructive/10">
                    <h3 className="text-xl font-bold text-destructive flex items-center gap-2">
                        <span className="text-2xl">⚠️</span> Failed to Load Data
                    </h3>
                    <p className="text-muted-foreground mt-2">
                        Could not fetch analytics. The server might be restarting or the database is initializing.
                    </p>
                    <div className="mt-4 flex gap-2 justify-center">
                        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                            Retry
                        </button>
                        <button onClick={() => {
                            localStorage.removeItem('analytics_auth');
                            setAuthenticated(false);
                        }} className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90">
                            Logout
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500 relative z-50 pb-20 min-h-screen bg-background">
            {/* Header */}
            <div className="flex justify-between items-center bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 p-6 rounded-xl backdrop-blur mb-6 border border-primary/20 shadow-lg">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                        Analytics Command Center
                    </h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Live • Auto-refresh every 30s • <span className="font-semibold text-green-500">{(data?.active_now || 0)} active now</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            localStorage.removeItem('analytics_auth');
                            setAuthenticated(false);
                        }}
                        className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all font-medium border border-destructive/20"
                    >
                        🔒 Logout
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                        <Eye className="h-5 w-5 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-pink-500">{(data?.total_visits || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">All time page views</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                        <Users className="h-5 w-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-500">{(data?.unique_visitors || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Distinct IP addresses</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                        <Activity className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-500">{(data?.active_now || 0)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 5 minutes</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Geographic Reach</CardTitle>
                        <Globe className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-500">{(data?.geo_data?.length || 0)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Unique locations</p>
                    </CardContent>
                </Card>
            </div>

            {/* Visitor Type */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Users className="h-5 w-5" />
                            New vs Returning Visitors
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">New Visitors</span>
                                    <span className="text-sm font-bold text-green-500">{(data?.new_vs_returning?.new_visitors || 0)}</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all opacity-80"
                                        style={{
                                            width: `${data?.unique_visitors ? (parseInt(data.new_vs_returning.new_visitors || '0') / data.unique_visitors * 100) : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">Returning Visitors</span>
                                    <span className="text-sm font-bold text-blue-500">{(data?.new_vs_returning?.returning_visitors || 0)}</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all opacity-80"
                                        style={{
                                            width: `${data?.unique_visitors ? (parseInt(data.new_vs_returning.returning_visitors || '0') / data.unique_visitors * 100) : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Smartphone className="h-5 w-5" />
                            Device Capabilities
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                                <Cpu className="h-6 w-6 mx-auto mb-2 text-primary opacity-80" />
                                <div className="text-2xl font-bold">{parseFloat(data?.device_capabilities?.avg_cores || '0').toFixed(1)}</div>
                                <div className="text-xs text-muted-foreground">Avg CPU Cores</div>
                            </div>
                            <div className="text-center p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
                                <Server className="h-6 w-6 mx-auto mb-2 text-purple-500 opacity-80" />
                                <div className="text-2xl font-bold">{parseFloat(data?.device_capabilities?.avg_memory || '0').toFixed(1)} GB</div>
                                <div className="text-xs text-muted-foreground">Avg RAM</div>
                            </div>
                            <div className="text-center p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                                <Monitor className="h-6 w-6 mx-auto mb-2 text-green-500 opacity-80" />
                                <div className="text-2xl font-bold">{(data?.device_capabilities?.touch_devices || 0)}</div>
                                <div className="text-xs text-muted-foreground">Touch Devices</div>
                            </div>
                            <div className="text-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                <Monitor className="h-6 w-6 mx-auto mb-2 text-blue-500 opacity-80" />
                                <div className="text-2xl font-bold">{(data?.device_capabilities?.non_touch_devices || 0)}</div>
                                <div className="text-xs text-muted-foreground">Desktop</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabbed Analytics */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5 p-1 bg-muted/50 rounded-lg">
                    <TabsTrigger value="overview">🌍 Overview</TabsTrigger>
                    <TabsTrigger value="devices">💻 Devices</TabsTrigger>
                    <TabsTrigger value="network">📡 Network</TabsTrigger>
                    <TabsTrigger value="traffic">🔗 Traffic</TabsTrigger>
                    <TabsTrigger value="recent">⚡ Recent</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4 mt-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Map View */}
                        <Card className="col-span-4 min-h-[500px] border-primary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-primary" />
                                    Global Visitor Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[450px] p-0 overflow-hidden rounded-b-lg border-t border-primary/10">
                                <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    />
                                    {data?.geo_data?.map((point, idx) => (
                                        <CircleMarker
                                            key={idx}
                                            center={[point.lat, point.lng]}
                                            pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.6 }}
                                            radius={Math.min(parseInt(point.count || '1') * 2 + 3, 20)}
                                        >
                                            <Popup>
                                                <div className="text-xs font-bold text-black p-1">
                                                    {point.city}, {point.country}<br />
                                                    {point.count} visits
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    ))}
                                </MapContainer>
                            </CardContent>
                        </Card>

                        {/* Platform Chart */}
                        <Card className="col-span-3 border-primary/10">
                            <CardHeader>
                                <CardTitle className="text-primary">Platform Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data?.platforms || []}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ platform_type, percent }) => `${platform_type} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={120}
                                                fill="#8884d8"
                                                dataKey="count"
                                                nameKey="platform_type"
                                            >
                                                {(data?.platforms || []).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* DEVICES TAB */}
                <TabsContent value="devices" className="space-y-4 mt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-primary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary">
                                    <Monitor className="h-5 w-5" />
                                    Operating Systems
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data?.operating_systems || []}>
                                            <XAxis dataKey="platform_os" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.8} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary">
                                    <Monitor className="h-5 w-5" />
                                    Screen Resolutions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data?.screen_resolutions || []}>
                                            <XAxis dataKey="resolution" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={80} />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* NETWORK TAB */}
                <TabsContent value="network" className="space-y-4 mt-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-primary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary">
                                    <Wifi className="h-5 w-5" />
                                    Connection Types
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {(data?.connection_types || []).map((conn, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/20">
                                            <span className="font-medium capitalize text-sm">{conn.connection_type}</span>
                                            <span className="text-primary font-bold">{conn.count}</span>
                                        </div>
                                    ))}
                                    {(!data?.connection_types || data.connection_types.length === 0) && (
                                        <div className="text-center text-muted-foreground py-4 text-sm">No connection data recorded</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary">
                                    <Clock className="h-5 w-5" />
                                    Top Timezones
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[200px]">
                                    <div className="space-y-2 pr-4">
                                        {(data?.timezones || []).map((tz, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2 bg-secondary/30 rounded text-sm border border-border/20">
                                                <span className="font-medium truncate max-w-[180px]">{tz.timezone}</span>
                                                <span className="text-primary font-bold">{tz.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary">
                                    <Server className="h-5 w-5" />
                                    Top ISPs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[200px]">
                                    <div className="space-y-2 pr-4">
                                        {(data?.top_isps || []).map((isp, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2 bg-secondary/30 rounded text-sm border border-border/20">
                                                <span className="font-medium truncate max-w-[180px]">{isp.isp}</span>
                                                <span className="text-primary font-bold">{isp.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TRAFFIC TAB */}
                <TabsContent value="traffic" className="space-y-4 mt-6">
                    <Card className="border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Link2 className="h-5 w-5" />
                                Top Referrers
                            </CardTitle>
                            <CardDescription>Where your visitors are coming from</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data?.top_referrers && data.top_referrers.length > 0 ? (
                                    data.top_referrers.map((ref, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-all border border-border/20">
                                            <span className="font-medium text-sm truncate max-w-[70%]">{ref.referrer}</span>
                                            <span className="text-primary font-bold text-xl">{ref.count}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-12 bg-secondary/10 rounded-xl border border-dashed border-border/50">
                                        <Link2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p className="text-lg">No external referrers yet.</p>
                                        <p className="text-sm opacity-50">All monitored traffic is currently direct.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* RECENT TAB */}
                <TabsContent value="recent" className="space-y-4 mt-6">
                    <Card className="border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Activity className="h-5 w-5" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription>Last 100 visits with comprehensive details</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] rounded-md border border-border/50">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[180px]">Time</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Page/Path</TableHead>
                                            <TableHead>System</TableHead>
                                            <TableHead>Resolution</TableHead>
                                            <TableHead>Connection</TableHead>
                                            <TableHead className="text-right">IP Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(data?.recent_visits || []).map((visit) => (
                                            <TableRow key={visit.id} className="hover:bg-secondary/40 transition-colors border-b border-border/10">
                                                <TableCell className="font-mono text-[10px] text-muted-foreground">
                                                    {new Date(visit.timestamp).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-bold">{visit.city}, {visit.country}</div>
                                                    <div className="opacity-60 text-[10px]">{visit.timezone}</div>
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px]">
                                                    <div className="max-w-[150px] truncate text-primary/80">{visit.path}</div>
                                                    {visit.referrer && visit.referrer !== 'direct' && (
                                                        <div className="text-[9px] text-blue-400 truncate max-w-[150px] mt-1">
                                                            source: {visit.referrer}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-[10px]">
                                                    <div className="font-medium">{visit.platform_os}</div>
                                                    <div className="opacity-50">{visit.platform_type}</div>
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px]">
                                                    {visit.screen_width}×{visit.screen_height}
                                                    {visit.touch_support && <div className="text-pink-500 font-bold mt-1 text-[8px] uppercase">Touch Enabled</div>}
                                                </TableCell>
                                                <TableCell className="text-[10px]">
                                                    <div className="font-medium text-emerald-500">{visit.connection_type}</div>
                                                    {visit.battery_level !== 'unknown' && (
                                                        <div className="opacity-60 flex items-center gap-1 mt-1">
                                                            <Battery className="h-2 w-2" />
                                                            {visit.battery_level}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="font-mono text-[10px] blur-[3px] hover:blur-none transition-all cursor-help bg-secondary/50 px-2 py-1 rounded inline-block">
                                                        {visit.ip}
                                                    </div>
                                                    <div className="text-muted-foreground text-[9px] truncate max-w-[120px] ml-auto mt-1">
                                                        {visit.isp}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {(!data?.recent_visits || data.recent_visits.length === 0) && (
                                    <div className="text-center py-20 text-muted-foreground">No recent activity logs found.</div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Analytics;
