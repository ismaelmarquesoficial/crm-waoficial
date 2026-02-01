import React, { useState, useEffect } from 'react';
import { Users, Building, Trash2, Plus, LogOut, LayoutDashboard } from 'lucide-react';

interface Tenant {
    id: number;
    name: string;
    plan_status: string;
    created_at: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    tenant_name: string;
}

interface SuperAdminDashboardProps {
    onLogout: () => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'tenants' | 'users'>('tenants');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [showTenantForm, setShowTenantForm] = useState(false);
    const [newTenantName, setNewTenantName] = useState('');

    const [showUserForm, setShowUserForm] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', tenantId: '', role: 'user' });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            if (activeTab === 'tenants') {
                const res = await fetch('http://localhost:3001/api/admin/tenants', { headers });
                const data = await res.json();
                setTenants(data);
            } else {
                const res = await fetch('http://localhost:3001/api/admin/users', { headers });
                const data = await res.json();
                setUsers(data);

                // Also fetch tenants for the user form select
                if (tenants.length === 0) {
                    const resTenants = await fetch('http://localhost:3001/api/admin/tenants', { headers });
                    const dataTenants = await resTenants.json();
                    setTenants(dataTenants);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Erro ao carregar dados. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:3001/api/admin/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newTenantName })
            });
            if (res.ok) {
                setNewTenantName('');
                setShowTenantForm(false);
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteTenant = async (id: number) => {
        if (!confirm('Tem certeza? Isso pode afetar usuários vinculados.')) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`http://localhost:3001/api/admin/tenants/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchData();
            else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:3001/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newUser)
            });
            if (res.ok) {
                setNewUser({ name: '', email: '', password: '', tenantId: '', role: 'user' });
                setShowUserForm(false);
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

        const token = localStorage.getItem('token');
        try {
            await fetch(`http://localhost:3001/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Super Admin
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('tenants')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'tenants' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
                    >
                        <Building size={20} /> Tenants
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
                    >
                        <Users size={20} /> Usuários
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <LogOut size={18} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {activeTab === 'tenants' ? 'Gerenciar Tenants' : 'Gerenciar Usuários'}
                    </h2>
                    <button
                        onClick={() => activeTab === 'tenants' ? setShowTenantForm(true) : setShowUserForm(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus size={18} /> {activeTab === 'tenants' ? 'Novo Tenant' : 'Novo Usuário'}
                    </button>
                </header>

                {/* Forms */}
                {showTenantForm && (
                    <div className="bg-white p-6 rounded-xl shadow-sm mb-6 animate-fade-in border border-slate-200">
                        <h3 className="font-bold mb-4">Novo Tenant</h3>
                        <form onSubmit={handleCreateTenant} className="flex gap-4">
                            <input
                                type="text"
                                placeholder="Nome da Empresa"
                                className="flex-1 px-4 py-2 border rounded-lg"
                                value={newTenantName}
                                onChange={e => setNewTenantName(e.target.value)}
                                required
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowTenantForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
                            </div>
                        </form>
                    </div>
                )}

                {showUserForm && (
                    <div className="bg-white p-6 rounded-xl shadow-sm mb-6 animate-fade-in border border-slate-200">
                        <h3 className="font-bold mb-4">Novo Usuário</h3>
                        <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Nome Completo"
                                className="px-4 py-2 border rounded-lg"
                                value={newUser.name}
                                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                className="px-4 py-2 border rounded-lg"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                required
                            />
                            <input
                                type="password"
                                placeholder="Senha"
                                className="px-4 py-2 border rounded-lg"
                                value={newUser.password}
                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                required
                            />
                            <select
                                className="px-4 py-2 border rounded-lg"
                                value={newUser.tenantId}
                                onChange={e => setNewUser({ ...newUser, tenantId: e.target.value })}
                                required
                            >
                                <option value="">Selecione a Empresa</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>

                            <select
                                className="px-4 py-2 border rounded-lg"
                                value={newUser.role}
                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                            >
                                <option value="user">Usuário Comum</option>
                                <option value="admin">Admin da Empresa</option>
                                <option value="superadmin">Super Admin</option>
                            </select>

                            <div className="col-span-2 flex justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Criar Usuário</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Lists */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {activeTab === 'tenants' ? (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Empresa</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Data Criação</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tenants.map(tenant => (
                                    <tr key={tenant.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500">#{tenant.id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{tenant.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                                {tenant.plan_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(tenant.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteTenant(tenant.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Empresa</th>
                                    <th className="px-6 py-4">Cargo</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{user.email}</td>
                                        <td className="px-6 py-4 text-slate-900">
                                            {user.tenant_name || <span className="text-slate-400 italic">Sem empresa</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
