import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Users, Eye, Globe } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

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
    platforms: { platform: string; count: string }[];
    recent_visits: any[];
    geo_data: { lat: number; lng: number; city: string; country: string; count: string }[];
}

const Analytics = () => {
    const [password, setPassword] = useState('');
    const [authenticated, setAuthenticated] = useState(false);

    // Simple client-side auth for now as requested
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin123') { // Placeholder, user can change
            setAuthenticated(true);
            localStorage.setItem('analytics_auth', 'true');
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
            <div className="min-h-screen flex items-center justify-center relative z-50">
                <Card className="w-full max-w-md bg-card/90 backdrop-blur border-primary/20 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-2xl text-primary">Analytics Login</CardTitle>
                        <CardDescription>Enter password to view analytics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Password"
                            />
                            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full animate-pulse hover:animate-none">
                                Access Dashboard
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
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading Analytics...</span>
            </div>
        );
    }

    // Handle Error State explicitly
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
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500 relative z-50 pb-20">
            <div className="flex justify-between items-center bg-card/50 p-4 rounded-lg backdrop-blur mb-6 border border-border/50">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Analytics Dashboard</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live updates every 30s
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono border border-primary/20">
                        v1.0.2
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.total_visits}</div>
                        <p className="text-xs text-muted-foreground">All time page views</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.unique_visitors}</div>
                        <p className="text-xs text-muted-foreground">Distinct IP addresses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Regions</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.geo_data.length}</div>
                        <p className="text-xs text-muted-foreground">Cities located</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Map View */}
                <Card className="col-span-4 min-h-[400px]">
                    <CardHeader>
                        <CardTitle>Visitor Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] p-0 overflow-hidden rounded-b-lg">
                        <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                            {data.geo_data.map((point, idx) => (
                                <CircleMarker
                                    key={idx}
                                    center={[point.lat, point.lng]}
                                    pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.6 }} // Pink/Magenta for neon feel
                                    radius={Math.min(parseInt(point.count) * 2 + 3, 20)}
                                >
                                    <Popup>
                                        <div className="text-xs font-bold text-black">
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
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Platforms</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.platforms}>
                                    <XAxis dataKey="platform" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Visits Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Path</TableHead>
                                    <TableHead>Platform</TableHead>
                                    <TableHead>IP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.recent_visits.map((visit) => (
                                    <TableRow key={visit.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {new Date(visit.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {visit.city}, {visit.country}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{visit.path}</TableCell>
                                        <TableCell>{visit.platform}</TableCell>
                                        <TableCell className="font-mono text-xs blur-[2px] hover:blur-none transition-all cursor-pointer">
                                            {visit.ip}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default Analytics;
