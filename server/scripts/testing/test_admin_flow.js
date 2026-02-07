const axios = require('axios');

async function testAdminFlow() {
    const api = axios.create({
        baseURL: 'http://localhost:3001/api'
    });

    try {
        console.log('1. Logging in as Super Admin...');
        const loginRes = await api.post('/login', {
            email: 'superadmin@talke.ia',
            password: 'root'
        });

        const token = loginRes.data.token;
        console.log('✅ Login successful. Token obtained.');
        console.log('User Role:', loginRes.data.user.role);

        // Set auth header
        const authConfig = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('\n2. Listing Tenants...');
        const tenantsRes = await api.get('/admin/tenants', authConfig);
        console.log('✅ Tenants found:', tenantsRes.data.length);
        console.table(tenantsRes.data);

        console.log('\n3. Creating New Tenant (Empresa Teste Script)...');
        const createRes = await api.post('/admin/tenants', {
            name: 'Empresa Teste Script'
        }, authConfig);
        console.log('✅ Tenant created:', createRes.data);

        console.log('\n4. Verifying List Update...');
        const verifyRes = await api.get('/admin/tenants', authConfig);
        const exists = verifyRes.data.find(t => t.id === createRes.data.id);

        if (exists) {
            console.log('✅ Verified! New tenant is in the list.');
        } else {
            console.error('❌ New tenant not found in list.');
        }

    } catch (err) {
        if (err.response) {
            console.error('❌ API Error:', err.response.status, err.response.data);
        } else {
            console.error('❌ Error:', err.message);
        }
    }
}

testAdminFlow();
