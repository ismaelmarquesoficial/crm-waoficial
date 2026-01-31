import React from 'react';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  MoreHorizontal,
  Calendar
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const trafficData = [
  { name: 'Seg', messages: 400, leads: 24 },
  { name: 'Ter', messages: 300, leads: 18 },
  { name: 'Qua', messages: 550, leads: 35 },
  { name: 'Qui', messages: 450, leads: 28 },
  { name: 'Sex', messages: 700, leads: 55 },
  { name: 'Sáb', messages: 350, leads: 20 },
  { name: 'Dom', messages: 200, leads: 15 },
];

const campaignData = [
  { name: 'Black Friday', sent: 1200, read: 980, replied: 150 },
  { name: 'Novidades', sent: 540, read: 400, replied: 45 },
  { name: 'Boas Vindas', sent: 300, read: 280, replied: 80 },
];

const StatCard = ({ title, value, subtext, icon: Icon, trend, color, variant }: any) => {
  const isHero = variant === 'hero';
  
  // Mapping new color palette
  const colorClasses = {
    meta: 'bg-meta/10 text-meta',
    wa: 'bg-wa/10 text-wa',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  const activeColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.meta;

  if (isHero) {
    return (
      <div className="bg-brand-gradient p-6 rounded-2xl shadow-xl shadow-meta/20 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity text-white">
           <ArrowUpRight size={20} />
        </div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md text-white shadow-inner border border-white/20">
            <Icon size={22} strokeWidth={1.5} />
          </div>
          <span className="text-white/80 text-sm font-medium border border-white/20 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm">
            Destaque
          </span>
        </div>
        
        <div className="relative z-10 text-white">
          <h3 className="text-3xl font-bold tracking-tight mb-1">{value}</h3>
          <p className="text-white/70 text-sm font-medium">{title}</p>
        </div>

        <div className="mt-4 flex items-center gap-2 relative z-10">
           {trend && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/10">
              {trend > 0 ? '+' : ''}{trend}%
            </span>
           )}
           <span className="text-xs text-white/60">{subtext}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-meta/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight size={20} className="text-slate-300" />
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl ${activeColor} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} strokeWidth={1.5} />
        </div>
      </div>
      
      <div>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{value}</h3>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
         {trend && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
         )}
         <span className="text-xs text-slate-400">{subtext}</span>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 animate-fade-in h-full overflow-y-auto bg-gradient-to-b from-white/50 to-transparent">
      
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
             Bom dia, <span className="text-transparent bg-clip-text bg-brand-gradient">Admin</span> 👋
           </h1>
           <p className="text-slate-500 mt-2 text-base">Visão geral da performance do seu atendimento e vendas.</p>
        </div>
        <div className="flex gap-3">
           <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm flex items-center gap-2">
             <Calendar size={16} /> Últimos 30 dias
           </button>
           <button className="px-5 py-2 bg-brand-gradient text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-meta/25 flex items-center gap-2">
             <MessageSquare size={16} /> Nova Campanha
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Mensagens Totais" 
          value="1,284" 
          subtext="vs. mês anterior"
          icon={MessageSquare}
          trend={12}
          color="meta"
          variant="hero"
        />
        <StatCard 
          title="Novos Leads" 
          value="48" 
          subtext="vs. ontem"
          icon={Users}
          trend={8}
          color="wa"
        />
        <StatCard 
          title="Conversão" 
          value="14.2%" 
          subtext="Média do setor: 10%"
          icon={TrendingUp}
          trend={-2}
          color="violet"
        />
        <StatCard 
          title="Saúde da API" 
          value="98%" 
          subtext="Tempo de atividade"
          icon={Activity}
          trend={0}
          color="amber"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Traffic Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-shadow duration-300">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Volume de Tráfego</h3>
              <p className="text-sm text-slate-400 font-medium">Interações de leads x mensagens</p>
            </div>
            <button className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0668E1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0668E1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25D366" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.15)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="messages" 
                  name="Mensagens"
                  stroke="#0668E1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMessages)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke="#25D366" 
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorLeads)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-shadow duration-300">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Performance de Campanhas</h3>
              <p className="text-sm text-slate-400 font-medium">Resultados dos últimos disparos</p>
            </div>
            <button className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
               <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} barSize={24} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.15)',
                    padding: '12px'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', fontWeight: 500 }} />
                <Bar dataKey="sent" name="Enviadas" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="read" name="Lidas" fill="#0668E1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="replied" name="Respostas" fill="#25D366" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;