import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Activity, Users, ShieldAlert, TrendingUp, PieChart as PieIcon, BarChart3, Target, Network, Layers, Radar as RadarIcon } from 'lucide-react';
import { cn } from '../App';

/* ─── MOCK DATA ─── */
const timeData = [
  { time: '00:00', normal: 120, attacks: 5 },
  { time: '04:00', normal: 80,  attacks: 12 },
  { time: '08:00', normal: 450, attacks: 8 },
  { time: '12:00', normal: 600, attacks: 35 },
  { time: '16:00', normal: 550, attacks: 42 },
  { time: '20:00', normal: 300, attacks: 18 },
  { time: '23:59', normal: 150, attacks: 7 },
];

const userCategories = [
  { name: 'Engineering', value: 340 },
  { name: 'Sales', value: 210 },
  { name: 'HR', value: 85 },
  { name: 'IT Support', value: 45 },
  { name: 'Executives', value: 20 },
];
const COLORS = ['#00A3A3', '#38BDF8', '#22C55E', '#F59E0B', '#DC2626'];

const attackTypes = [
  { name: 'Brute Force', count: 124 },
  { name: 'Imp. Travel', count: 85 },
  { name: 'Device Spoof', count: 42 },
  { name: 'Lateral Mvt', count: 28 },
  { name: 'Exfiltration', count: 15 },
];

const riskDistribution = [
  { range: '0.0-0.2', count: 850 },
  { range: '0.2-0.4', count: 320 },
  { range: '0.4-0.6', count: 150 },
  { range: '0.6-0.8', count: 85 },
  { range: '0.8-1.0', count: 45 },
];

const radarData = [
  { subject: 'Location Variance', AI_Threat_Profile: 120, Baseline_Normal: 30, fullMark: 150 },
  { subject: 'Time Deviation', AI_Threat_Profile: 98, Baseline_Normal: 40, fullMark: 150 },
  { subject: 'Command Sequence', AI_Threat_Profile: 140, Baseline_Normal: 20, fullMark: 150 },
  { subject: 'Network Anomalies', AI_Threat_Profile: 99, Baseline_Normal: 25, fullMark: 150 },
  { subject: 'Auth Failures', AI_Threat_Profile: 130, Baseline_Normal: 10, fullMark: 150 },
  { subject: 'Data Volume', AI_Threat_Profile: 85, Baseline_Normal: 60, fullMark: 150 },
];

const stackedAuthData = [
  { day: 'Mon', Success: 4200, Blocked: 120 },
  { day: 'Tue', Success: 4500, Blocked: 139 },
  { day: 'Wed', Success: 4100, Blocked: 980 }, // Spike day
  { day: 'Thu', Success: 4700, Blocked: 390 },
  { day: 'Fri', Success: 3800, Blocked: 480 },
  { day: 'Sat', Success: 1200, Blocked: 380 },
  { day: 'Sun', Success: 1100, Blocked: 430 },
];

const scatterData = [
  { duration: 2,  failures: 14, type: 'Brute Force', size: 400 },
  { duration: 5,  failures: 22, type: 'Brute Force', size: 600 },
  { duration: 8,  failures: 12, type: 'Brute Force', size: 300 },
  { duration: 45, failures: 1,  type: 'Normal', size: 100 },
  { duration: 60, failures: 0,  type: 'Normal', size: 80 },
  { duration: 90, failures: 2,  type: 'Normal', size: 150 },
  { duration: 120, failures: 0, type: 'Normal', size: 100 },
  { duration: 15, failures: 0,  type: 'Spoofed', size: 250 },
  { duration: 20, failures: 1,  type: 'Spoofed', size: 200 },
];

/* ─── COMPONENTS ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-md shadow-card" style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', zIndex: 50 }}>
        {label && <p className="text-[13px] font-semibold mb-2 pb-2" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}>{label}</p>}
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-[12px] font-medium py-0.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span style={{ color: 'var(--text-secondary)' }}>{entry.name || entry.dataKey}:</span>
            <span className="font-semibold ml-auto pl-4 tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function ChartCard({ title, description, icon: Icon, children, delay = 0, fullWidth = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay, ease: 'easeOut' }}
      className={cn(
        "rounded-card p-6 flex flex-col",
        fullWidth ? "col-span-1 xl:col-span-2" : "col-span-1"
      )}
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start gap-3 mb-6">
        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--accent-primary-muted)', color: 'var(--accent-primary)' }}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {description && (
            <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[280px] w-full flex items-center justify-center">
        {children}
      </div>
    </motion.div>
  );
}

export default function AnalyticsDashboard() {
  return (
    <div className="flex-1 overflow-y-auto p-6 pb-20" style={{ background: 'var(--bg-base)' }}>
      
      <div className="mb-6">
        <h1 className="text-page font-bold flex items-center gap-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-primary)', color: '#fff' }}>
            <BarChart3 className="w-4 h-4" />
          </div>
          Threat Intelligence
        </h1>
        <p className="text-[13px] mt-1.5 font-normal" style={{ color: 'var(--text-secondary)' }}>
          Comprehensive metrics, behavioral analysis, and threat clustering across the organization.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* 1. Attacks Over Time (Area) */}
        <ChartCard 
          title="Traffic & Anomalies Over Time" 
          description="Visualizes the volume of normal employee sessions compared to detected cyber attacks over a 24-hour cycle. Look for suspicious off-hours spikes."
          icon={Activity} 
          delay={0.1}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A3A3" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#00A3A3" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
              <XAxis dataKey="time" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="normal" name="Valid Sessions" stroke="#00A3A3" strokeWidth={2} fillOpacity={1} fill="url(#colorNormal)" />
              <Area type="monotone" dataKey="attacks" name="Detected Anomalies" stroke="#DC2626" strokeWidth={2} fillOpacity={1} fill="url(#colorAttacks)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Spider Net / Radar Chart */}
        <ChartCard 
          title="Multidimensional Risk Radar" 
          description="The 'Spider Net' AI analysis. Maps the severity of deviations across six behavioral dimensions, comparing the active threat profile against normal baseline behavior."
          icon={RadarIcon} 
          delay={0.2}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="rgba(150,150,150,0.2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(150,150,150,0.8)', fontSize: 11, fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
              <Radar name="AI Threat Profile" dataKey="AI_Threat_Profile" stroke="#DC2626" strokeWidth={1.5} fill="#DC2626" fillOpacity={0.2} />
              <Radar name="Baseline Normal" dataKey="Baseline_Normal" stroke="#00A3A3" strokeWidth={1.5} fill="#00A3A3" fillOpacity={0.15} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. User Demographics (Pie) */}
        <ChartCard 
          title="User Department Distribution" 
          description="A breakdown of active sessions organized by internal corporate departments. Helpful for isolating targeted phishing campaigns in specific sectors."
          icon={PieIcon} 
          delay={0.3}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={userCategories}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {userCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Attack Types (Bar) */}
        <ChartCard 
          title="Threat Vectors Breakdown" 
          description="Categorizes all flagged incidents into their specific MITRE ATT&CK techniques, sorted by highest frequency."
          icon={ShieldAlert} 
          delay={0.4}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attackTypes} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(150,150,150,0.15)" />
              <XAxis type="number" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(150,150,150,0.05)' }} />
              <Bar dataKey="count" name="Attack Count" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={24}>
                {attackTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Authentication Volumes (Stacked Bar) */}
        <ChartCard 
          title="Weekly Authentication Success vs. Blocks" 
          description="Monitors daily successful logins against failed/blocked attempts. The large spike indicates a sustained credential stuffing attack on Wednesday."
          icon={Layers} 
          delay={0.5}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedAuthData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
              <XAxis dataKey="day" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(150,150,150,0.05)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Success" stackId="a" fill="#22C55E" radius={[0, 0, 4, 4]} barSize={28} />
              <Bar dataKey="Blocked" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. Behavioral Clustering (Scatter) */}
        <ChartCard 
          title="Behavioral Clustering (Session vs. Failures)" 
          description="AI Isolation Forest clustering. Plots Session Duration (mins) against Failed Attempts. Outliers in the top-left heavily indicate Brute Force bots."
          icon={Target} 
          delay={0.6}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
              <XAxis type="number" dataKey="duration" name="Duration (min)" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey="failures" name="Failed Attempts" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <ZAxis type="number" dataKey="size" range={[100, 800]} />
              <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter name="Clustered Events" data={scatterData} fill="#00A3A3" opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 7. Risk Distribution (Line) - FULL WIDTH */}
        <ChartCard 
          title="Event Risk Score Distribution" 
          description="A bell curve distribution mapping the volume of events against their AI-generated Risk Score. A healthy system is skewed heavily to the left (0.0 - 0.2)."
          icon={TrendingUp} 
          delay={0.7}
          fullWidth={true}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={riskDistribution} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
              <XAxis dataKey="range" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line 
                type="monotone" 
                dataKey="count" 
                name="Number of Events" 
                stroke="#00A3A3" 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-surface)' }}
                activeDot={{ r: 6, fill: '#00A3A3', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}
